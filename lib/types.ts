export type RunStatus = "completed" | "failed" | "in_progress";
export type Severity = "low" | "medium" | "high" | "critical";
export type EventLevel = "info" | "warning" | "error";
export type MetricResult = "pass" | "fail";

export interface SummaryMetric {
  total_test_runs: number;
  pass_rate: number;
  pass_rate_delta: number;
  failed_scenarios: number;
  failed_scenarios_delta: number;
  average_safety_score: number;
  safety_score_delta: number;
  average_reaction_time_ms: number;
  reaction_time_delta_ms: number;
}

export interface TestRun {
  id: string;
  date: string;
  scenario_type: string;
  total_scenarios: number;
  passed: number;
  failed: number;
  avg_safety_score: number;
  status: RunStatus;
  reaction_time_ms: number;
  created_at: string;
}

export interface EvaluationEvent {
  id: number;
  time: string;
  label: string;
  detail: string;
  level: EventLevel;
}

export interface MetricRow {
  id: number;
  metric: string;
  value: string;
  threshold: string;
  result: MetricResult;
}

export interface ReviewNote {
  id: number;
  author: string;
  time: string;
  text: string;
}

export interface ScenarioDetail {
  start_time: string;
  failure_reason: string | null;
  severity: Severity | null;
}

export interface TestRunDetail extends TestRun {
  detail: ScenarioDetail | null;
  timeline_events: EvaluationEvent[];
  metric_rows: MetricRow[];
  review_notes: ReviewNote[];
}

export interface FailureReason {
  id: number;
  reason: string;
  count: number;
  severity: Severity;
  trend: number;
  description: string;
}

export interface PassFailTrendPoint {
  date: string;
  passed: number;
  failed: number;
}

export interface FailuresByScenarioPoint {
  scenario_type: string;
  failures: number;
}
