import os

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import Base, engine, get_db
from app.seed import seed_database

app = FastAPI(title="AV Simulation Evaluation API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        frontend_origin,
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    from app.database import SessionLocal

    with SessionLocal() as db:
        seed_database(db, force=False)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/metrics/summary", response_model=schemas.SummaryMetric)
def metrics_summary(db: Session = Depends(get_db)) -> schemas.SummaryMetric:
    return crud.get_summary(db)


@app.get("/api/runs", response_model=list[schemas.TestRunRead])
def list_runs(
    status: str | None = Query(default=None),
    scenario_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[models.TestRun]:
    return crud.get_runs(db, status=status, scenario_type=scenario_type, search=search)


@app.get("/api/runs/{run_id}", response_model=schemas.TestRunDetailRead)
def retrieve_run(run_id: str, db: Session = Depends(get_db)) -> models.TestRun:
    run = crud.get_run(db, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Test run not found")
    return run


@app.delete("/api/runs/{run_id}")
def delete_run(run_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    deleted = crud.delete_run(db, run_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Test run not found")
    return {"status": "deleted", "id": run_id}


@app.post("/api/runs/generate", response_model=schemas.TestRunRead, status_code=201)
def generate_run(db: Session = Depends(get_db)) -> models.TestRun:
    return crud.create_synthetic_run(db)


@app.get("/api/failures", response_model=list[schemas.FailureReasonRead])
def failures(db: Session = Depends(get_db)) -> list[models.FailureReason]:
    return crud.get_failures(db)


@app.get("/api/charts/pass-fail-trend", response_model=list[schemas.PassFailTrendPoint])
def pass_fail_trend(db: Session = Depends(get_db)) -> list[schemas.PassFailTrendPoint]:
    return crud.get_pass_fail_trend(db)


@app.get("/api/charts/failures-by-scenario", response_model=list[schemas.FailuresByScenarioPoint])
def failures_by_scenario(db: Session = Depends(get_db)) -> list[schemas.FailuresByScenarioPoint]:
    return crud.get_failures_by_scenario(db)
