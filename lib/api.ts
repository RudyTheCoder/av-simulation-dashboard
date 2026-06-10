import type {
  FailureReason,
  FailuresByScenarioPoint,
  PassFailTrendPoint,
  SummaryMetric,
  TestRun,
  TestRunDetail,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getSummary() {
  return request<SummaryMetric>("/api/metrics/summary");
}

export function getRuns(filters?: { status?: string; scenario_type?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.scenario_type) params.set("scenario_type", filters.scenario_type);
  if (filters?.search) params.set("search", filters.search);
  const query = params.toString();
  return request<TestRun[]>(`/api/runs${query ? `?${query}` : ""}`);
}

export function getRun(id: string) {
  return request<TestRunDetail>(`/api/runs/${id}`);
}

export function generateRun() {
  return request<TestRun>("/api/runs/generate", { method: "POST" });
}

export function deleteTestRun(runId: string) {
  return request<{ status: string; id: string }>(`/api/runs/${runId}`, { method: "DELETE" });
}

export function getFailures() {
  return request<FailureReason[]>("/api/failures");
}

export function getPassFailTrend() {
  return request<PassFailTrendPoint[]>("/api/charts/pass-fail-trend");
}

export function getFailuresByScenario() {
  return request<FailuresByScenarioPoint[]>("/api/charts/failures-by-scenario");
}
