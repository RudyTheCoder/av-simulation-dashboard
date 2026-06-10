from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TestRun(Base):
    __tablename__ = "test_runs"

    id: Mapped[str] = mapped_column(String(24), primary_key=True, index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    scenario_type: Mapped[str] = mapped_column(String(80), index=True)
    total_scenarios: Mapped[int] = mapped_column(Integer)
    passed: Mapped[int] = mapped_column(Integer)
    failed: Mapped[int] = mapped_column(Integer)
    avg_safety_score: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(24), index=True)
    reaction_time_ms: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, index=True)

    detail: Mapped["ScenarioDetail"] = relationship(back_populates="test_run", cascade="all, delete-orphan", uselist=False)
    timeline_events: Mapped[list["EvaluationEvent"]] = relationship(back_populates="test_run", cascade="all, delete-orphan")
    metric_rows: Mapped[list["MetricRow"]] = relationship(back_populates="test_run", cascade="all, delete-orphan")
    review_notes: Mapped[list["ReviewNote"]] = relationship(back_populates="test_run", cascade="all, delete-orphan")


class ScenarioDetail(Base):
    __tablename__ = "scenario_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_run_id: Mapped[str] = mapped_column(ForeignKey("test_runs.id", ondelete="CASCADE"), unique=True, index=True)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    failure_reason: Mapped[str | None] = mapped_column(String(160), nullable=True)
    severity: Mapped[str | None] = mapped_column(String(24), nullable=True)

    test_run: Mapped[TestRun] = relationship(back_populates="detail")


class EvaluationEvent(Base):
    __tablename__ = "evaluation_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_run_id: Mapped[str] = mapped_column(ForeignKey("test_runs.id", ondelete="CASCADE"), index=True)
    time: Mapped[str] = mapped_column(String(16))
    label: Mapped[str] = mapped_column(String(120))
    detail: Mapped[str] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(24))

    test_run: Mapped[TestRun] = relationship(back_populates="timeline_events")


class MetricRow(Base):
    __tablename__ = "metric_rows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_run_id: Mapped[str] = mapped_column(ForeignKey("test_runs.id", ondelete="CASCADE"), index=True)
    metric: Mapped[str] = mapped_column(String(120))
    value: Mapped[str] = mapped_column(String(80))
    threshold: Mapped[str] = mapped_column(String(80))
    result: Mapped[str] = mapped_column(String(12))

    test_run: Mapped[TestRun] = relationship(back_populates="metric_rows")


class ReviewNote(Base):
    __tablename__ = "review_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    test_run_id: Mapped[str] = mapped_column(ForeignKey("test_runs.id", ondelete="CASCADE"), index=True)
    author: Mapped[str] = mapped_column(String(80))
    time: Mapped[str] = mapped_column(String(40))
    text: Mapped[str] = mapped_column(Text)

    test_run: Mapped[TestRun] = relationship(back_populates="review_notes")


class FailureReason(Base):
    __tablename__ = "failure_reasons"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reason: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    count: Mapped[int] = mapped_column(Integer)
    severity: Mapped[str] = mapped_column(String(24))
    trend: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(Text)
