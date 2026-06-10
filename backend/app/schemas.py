from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

RunStatus = Literal["completed", "failed", "in_progress"]
Severity = Literal["low", "medium", "high", "critical"]
EventLevel = Literal["info", "warning", "error"]
MetricResult = Literal["pass", "fail"]


class SummaryMetric(BaseModel):
    total_test_runs: int
    pass_rate: float
    pass_rate_delta: float
    failed_scenarios: int
    failed_scenarios_delta: int
    average_safety_score: float
    safety_score_delta: float
    average_reaction_time_ms: float
    reaction_time_delta_ms: float


class TestRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    date: datetime
    scenario_type: str
    total_scenarios: int
    passed: int
    failed: int
    avg_safety_score: float
    status: RunStatus
    reaction_time_ms: int
    created_at: datetime


class ScenarioDetailRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start_time: datetime
    failure_reason: str | None
    severity: Severity | None


class EvaluationEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    time: str
    label: str
    detail: str
    level: EventLevel


class MetricRowRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    metric: str
    value: str
    threshold: str
    result: MetricResult


class ReviewNoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author: str
    time: str
    text: str


class TestRunDetailRead(TestRunRead):
    detail: ScenarioDetailRead | None
    timeline_events: list[EvaluationEventRead]
    metric_rows: list[MetricRowRead]
    review_notes: list[ReviewNoteRead]


class FailureReasonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reason: str
    count: int
    severity: Severity
    trend: int
    description: str


class PassFailTrendPoint(BaseModel):
    date: str
    passed: int
    failed: int


class FailuresByScenarioPoint(BaseModel):
    scenario_type: str
    failures: int
