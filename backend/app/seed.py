from datetime import datetime, timedelta, timezone
import random

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app import models
from app.crud import FAILURE_DESCRIPTIONS, FAILURE_REASONS, create_synthetic_run, failure_reason_seed_counts
from app.database import Base, SessionLocal, engine


def seed_database(db: Session, force: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    has_runs = db.scalars(select(models.TestRun.id).limit(1)).first()
    if has_runs and not force:
        return

    if force:
        db.execute(delete(models.ReviewNote))
        db.execute(delete(models.MetricRow))
        db.execute(delete(models.EvaluationEvent))
        db.execute(delete(models.ScenarioDetail))
        db.execute(delete(models.TestRun))
        db.execute(delete(models.FailureReason))
        db.commit()

    random.seed(42)
    start = datetime.now(timezone.utc) - timedelta(days=16)
    for index in range(15):
        create_synthetic_run(
            db,
            run_id=f"RUN-{2041 + index}",
            date=start + timedelta(days=index, hours=random.randint(1, 20), minutes=random.randint(0, 55)),
        )

    runs = list(db.scalars(select(models.TestRun)).all())
    counts = failure_reason_seed_counts(runs)
    severities = {
        "Late pedestrian detection": "critical",
        "Unsafe following distance": "high",
        "Hard braking threshold exceeded": "medium",
        "Lane departure": "high",
        "Stop sign missed": "critical",
        "Collision risk too high": "critical",
    }
    trends = {
        "Late pedestrian detection": 18,
        "Unsafe following distance": 11,
        "Hard braking threshold exceeded": -6,
        "Lane departure": 8,
        "Stop sign missed": -3,
        "Collision risk too high": 22,
    }
    for reason in FAILURE_REASONS:
        existing = db.scalars(select(models.FailureReason).where(models.FailureReason.reason == reason)).first()
        if existing:
            existing.count = max(existing.count, counts.get(reason, 0))
            existing.severity = severities[reason]
            existing.trend = trends[reason]
            existing.description = FAILURE_DESCRIPTIONS[reason]
        else:
            db.add(
                models.FailureReason(
                    reason=reason,
                    count=max(1, counts.get(reason, random.randint(1, 7))),
                    severity=severities[reason],
                    trend=trends[reason],
                    description=FAILURE_DESCRIPTIONS[reason],
                )
            )
    db.commit()


def main() -> None:
    with SessionLocal() as db:
        seed_database(db, force=True)
    print("Seeded av_sim_dashboard with 15 test runs.")


if __name__ == "__main__":
    main()
