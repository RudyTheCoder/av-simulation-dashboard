from __future__ import annotations

import random
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app import models
from app.schemas import FailuresByScenarioPoint, PassFailTrendPoint, SummaryMetric

SCENARIO_TYPES = [
    "Urban Intersection",
    "Highway Merge",
    "Pedestrian Crossing",
    "Adverse Weather",
    "Cut-in / Lane Change",
    "Roundabout",
    "Parking / Low Speed",
]

FAILURE_REASONS = [
    "Late pedestrian detection",
    "Unsafe following distance",
    "Hard braking threshold exceeded",
    "Lane departure",
    "Stop sign missed",
    "Collision risk too high",
]

FAILURE_DESCRIPTIONS = {
    "Late pedestrian detection": "Perception latency exceeded the pedestrian intent-detection window during a crossing interaction.",
    "Unsafe following distance": "Planner allowed time headway to fall below the configured safe-following threshold.",
    "Hard braking threshold exceeded": "Longitudinal controller exceeded the maximum comfortable deceleration target.",
    "Lane departure": "Vehicle path drifted beyond lane boundary tolerance during lateral control recovery.",
    "Stop sign missed": "Traffic-control recognition failed to produce a stop command before the stop line.",
    "Collision risk too high": "Predicted trajectory overlap produced an unacceptable time-to-collision estimate.",
}


def get_runs(db: Session, status: str | None = None, scenario_type: str | None = None, search: str | None = None) -> list[models.TestRun]:
    stmt = select(models.TestRun).options(selectinload(models.TestRun.detail)).order_by(models.TestRun.date.desc())
    if status:
        stmt = stmt.where(models.TestRun.status == status)
    if scenario_type:
        stmt = stmt.where(models.TestRun.scenario_type == scenario_type)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.join(models.ScenarioDetail, isouter=True).where(
            or_(
                models.TestRun.id.ilike(pattern),
                models.TestRun.scenario_type.ilike(pattern),
                models.ScenarioDetail.failure_reason.ilike(pattern),
            )
        )
    return list(db.scalars(stmt).all())


def get_run(db: Session, run_id: str) -> models.TestRun | None:
    stmt = (
        select(models.TestRun)
        .where(models.TestRun.id == run_id)
        .options(
            selectinload(models.TestRun.detail),
            selectinload(models.TestRun.timeline_events),
            selectinload(models.TestRun.metric_rows),
            selectinload(models.TestRun.review_notes),
        )
    )
    return db.scalars(stmt).first()


def delete_run(db: Session, run_id: str) -> bool:
    run = get_run(db, run_id)
    if not run:
        return False

    db.delete(run)
    db.commit()
    return True


def get_summary(db: Session) -> SummaryMetric:
    runs = list(db.scalars(select(models.TestRun).order_by(models.TestRun.date.asc())).all())
    if not runs:
        return SummaryMetric(
            total_test_runs=0,
            pass_rate=0,
            pass_rate_delta=0,
            failed_scenarios=0,
            failed_scenarios_delta=0,
            average_safety_score=0,
            safety_score_delta=0,
            average_reaction_time_ms=0,
            reaction_time_delta_ms=0,
        )

    total_scenarios = sum(run.total_scenarios for run in runs)
    total_passed = sum(run.passed for run in runs)
    failed_scenarios = sum(run.failed for run in runs)
    pass_rate = (total_passed / total_scenarios) * 100 if total_scenarios else 0
    avg_score = sum(run.avg_safety_score for run in runs) / len(runs)
    avg_reaction = sum(run.reaction_time_ms for run in runs) / len(runs)

    midpoint = max(1, len(runs) // 2)
    previous = runs[:midpoint]
    recent = runs[midpoint:]

    def window_pass_rate(window: list[models.TestRun]) -> float:
        total = sum(run.total_scenarios for run in window)
        return (sum(run.passed for run in window) / total) * 100 if total else 0

    previous_reaction = sum(run.reaction_time_ms for run in previous) / len(previous)
    recent_reaction = sum(run.reaction_time_ms for run in recent) / len(recent) if recent else previous_reaction
    previous_score = sum(run.avg_safety_score for run in previous) / len(previous)
    recent_score = sum(run.avg_safety_score for run in recent) / len(recent) if recent else previous_score

    return SummaryMetric(
        total_test_runs=len(runs),
        pass_rate=pass_rate,
        pass_rate_delta=window_pass_rate(recent) - window_pass_rate(previous),
        failed_scenarios=failed_scenarios,
        failed_scenarios_delta=sum(run.failed for run in recent) - sum(run.failed for run in previous),
        average_safety_score=avg_score,
        safety_score_delta=recent_score - previous_score,
        average_reaction_time_ms=avg_reaction,
        reaction_time_delta_ms=recent_reaction - previous_reaction,
    )


def get_failures(db: Session) -> list[models.FailureReason]:
    return list(db.scalars(select(models.FailureReason).order_by(models.FailureReason.count.desc())).all())


def get_pass_fail_trend(db: Session) -> list[PassFailTrendPoint]:
    rows = db.execute(
        select(
            func.date(models.TestRun.date).label("day"),
            func.sum(models.TestRun.passed),
            func.sum(models.TestRun.failed),
        )
        .group_by("day")
        .order_by("day")
    ).all()
    return [PassFailTrendPoint(date=str(day), passed=int(passed or 0), failed=int(failed or 0)) for day, passed, failed in rows]


def get_failures_by_scenario(db: Session) -> list[FailuresByScenarioPoint]:
    rows = db.execute(
        select(models.TestRun.scenario_type, func.sum(models.TestRun.failed))
        .group_by(models.TestRun.scenario_type)
        .order_by(func.sum(models.TestRun.failed).desc())
    ).all()
    return [FailuresByScenarioPoint(scenario_type=scenario_type, failures=int(failures or 0)) for scenario_type, failures in rows]


def next_run_id(db: Session) -> str:
    ids = list(db.scalars(select(models.TestRun.id)).all())
    numeric = [int(item.split("-")[1]) for item in ids if item.startswith("RUN-") and item.split("-")[1].isdigit()]
    return f"RUN-{(max(numeric) if numeric else 2040) + 1}"


def create_synthetic_run(db: Session, run_id: str | None = None, date: datetime | None = None) -> models.TestRun:
    scenario = random.choice(SCENARIO_TYPES)
    total = random.randint(36, 84)
    failed = random.choices([0, 1, 2, 3, 4, 5, 6], weights=[18, 18, 15, 10, 6, 3, 2])[0]
    passed = total - failed
    status = "failed" if failed >= 4 else random.choices(["completed", "in_progress"], weights=[7, 1])[0]
    if status == "in_progress":
        passed = random.randint(max(1, total // 3), max(2, total - 8))
        failed = random.randint(0, 2)
    safety_score = round(max(62, min(99, 96 - failed * random.uniform(2.4, 5.7) + random.uniform(-2, 2))), 1)
    reaction_time = int(max(160, random.gauss(335 + failed * 28, 42)))
    created_at = date or datetime.now(timezone.utc)
    failure_reason = random.choice(FAILURE_REASONS) if failed > 0 else None
    severity = None
    if failed > 0:
        severity = random.choices(["low", "medium", "high", "critical"], weights=[2, 6, 4, 1])[0]

    run = models.TestRun(
        id=run_id or next_run_id(db),
        date=created_at,
        scenario_type=scenario,
        total_scenarios=total,
        passed=passed,
        failed=failed,
        avg_safety_score=safety_score,
        status=status,
        reaction_time_ms=reaction_time,
        created_at=created_at,
    )
    run.detail = models.ScenarioDetail(
        start_time=created_at - timedelta(minutes=random.randint(24, 96)),
        failure_reason=failure_reason,
        severity=severity,
    )
    run.timeline_events = build_events(scenario, failure_reason)
    run.metric_rows = build_metrics(safety_score, reaction_time, failed)
    run.review_notes = build_notes(failure_reason, severity)
    db.add(run)

    if failure_reason:
        reason = db.scalars(select(models.FailureReason).where(models.FailureReason.reason == failure_reason)).first()
        if reason:
            reason.count += 1
            reason.trend = min(35, reason.trend + random.randint(1, 4))

    db.commit()
    db.refresh(run)
    return get_run(db, run.id) or run


def build_events(scenario: str, failure_reason: str | None) -> list[models.EvaluationEvent]:
    events = [
        models.EvaluationEvent(time="00:00", label="Scenario initialized", detail=f"{scenario} map, actors, and evaluator thresholds loaded.", level="info"),
        models.EvaluationEvent(time="00:18", label="Ego vehicle engaged", detail="Autonomy stack entered closed-loop control with nominal localization confidence.", level="info"),
        models.EvaluationEvent(time="01:07", label="Primary interaction", detail="Planner negotiated actor behavior and maintained route objective.", level="info"),
    ]
    if failure_reason:
        events.append(models.EvaluationEvent(time="01:42", label="Evaluator warning", detail=failure_reason, level="warning"))
        events.append(models.EvaluationEvent(time="02:15", label="Run flagged", detail="Scenario exceeded at least one safety or comfort threshold.", level="error"))
    else:
        events.append(models.EvaluationEvent(time="02:04", label="Scenario cleared", detail="All evaluator checks remained within configured bounds.", level="info"))
    return events


def build_metrics(safety_score: float, reaction_time: int, failed: int) -> list[models.MetricRow]:
    return [
        models.MetricRow(metric="Safety score", value=f"{safety_score:.1f}", threshold=">= 85.0", result="pass" if safety_score >= 85 else "fail"),
        models.MetricRow(metric="Reaction time", value=f"{reaction_time} ms", threshold="<= 420 ms", result="pass" if reaction_time <= 420 else "fail"),
        models.MetricRow(metric="Collision risk", value=f"{max(0.02, failed * 0.08):.2f}", threshold="<= 0.25", result="pass" if failed < 4 else "fail"),
        models.MetricRow(metric="Comfort braking", value=f"{2.2 + failed * 0.42:.1f} m/s^2", threshold="<= 3.8 m/s^2", result="pass" if failed < 4 else "fail"),
    ]


def build_notes(failure_reason: str | None, severity: str | None) -> list[models.ReviewNote]:
    if not failure_reason:
        return [
            models.ReviewNote(author="Maya Chen", time="QA review", text="Run meets regression criteria. No manual escalation required."),
            models.ReviewNote(author="Autonomy Eval Bot", time="Automated", text="Metrics exported for trend analysis and baseline comparison."),
        ]
    return [
        models.ReviewNote(author="Maya Chen", time="QA review", text=f"{failure_reason} reproduced in closed-loop replay. Severity marked {severity}."),
        models.ReviewNote(author="Autonomy Eval Bot", time="Automated", text="Attach planner and perception traces before the next triage sync."),
    ]


def failure_reason_seed_counts(runs: list[models.TestRun]) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for run in runs:
        if run.detail and run.detail.failure_reason:
            counts[run.detail.failure_reason] += max(1, run.failed)
    return counts
