"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { deleteTestRun, generateRun, getRuns } from "@/lib/api";
import type { TestRun } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button, EmptyState, ErrorPanel, LoadingPanel, Panel, PanelHeader, StatusBadge } from "@/components/ui";

const statuses = ["", "completed", "failed", "in_progress"];
const scenarioTypes = [
  "",
  "Urban Intersection",
  "Highway Merge",
  "Pedestrian Crossing",
  "Adverse Weather",
  "Cut-in / Lane Change",
  "Roundabout",
  "Parking / Low Speed",
];

export default function TestRunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [status, setStatus] = useState("");
  const [scenarioType, setScenarioType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => ({ status, scenario_type: scenarioType, search }), [status, scenarioType, search]);

  async function loadRuns() {
    setError(null);
    const data = await getRuns(filters);
    setRuns(data);
  }

  useEffect(() => {
    setLoading(true);
    const timeout = window.setTimeout(() => {
      loadRuns()
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [filters]);

  async function onGenerate() {
    setGenerating(true);
    setError(null);
    try {
      await generateRun();
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate test run.");
    } finally {
      setGenerating(false);
    }
  }

  async function onDelete(runId: string) {
    const confirmed = window.confirm(`Delete test run ${runId}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingRunId(runId);
    setError(null);
    try {
      await deleteTestRun(runId);
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete test run.");
    } finally {
      setDeletingRunId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Test Runs</h1>
          <p className="mt-2 text-sm text-muted">Filter and inspect persisted simulation evaluation runs.</p>
        </div>
        <Button onClick={onGenerate} disabled={generating}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {generating ? "Generating" : "Generate Test Run"}
        </Button>
      </div>

      {error ? <ErrorPanel message={error} /> : null}

      <Panel>
        <PanelHeader title="Run Explorer" subtitle="Search by run id, scenario type, or failure context" />
        <div className="grid gap-3 border-b border-border p-5 md:grid-cols-[1fr_220px_240px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              className="h-10 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm outline-none ring-brand/20 focus:ring-4"
              placeholder="Search RUN-2041 or pedestrian"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none ring-brand/20 focus:ring-4"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statuses.map((item) => (
              <option key={item || "all"} value={item}>{item ? item.replace("_", " ") : "All statuses"}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none ring-brand/20 focus:ring-4"
            value={scenarioType}
            onChange={(event) => setScenarioType(event.target.value)}
          >
            {scenarioTypes.map((item) => (
              <option key={item || "all"} value={item}>{item || "All scenario types"}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-5"><LoadingPanel label="Loading runs" /></div>
        ) : runs.length === 0 ? (
          <EmptyState title="No runs found" detail="Adjust filters or generate a new test run." />
        ) : (
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-surface text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Run ID</th>
                  <th className="px-5 py-3 font-semibold">Scenario Type</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Passed</th>
                  <th className="px-5 py-3 font-semibold">Failed</th>
                  <th className="px-5 py-3 font-semibold">Safety</th>
                  <th className="px-5 py-3 font-semibold">Reaction</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-surface/70">
                    <td className="px-5 py-4 font-medium">
                      <Link className="text-accent hover:underline" href={`/scenario/${run.id}`}>{run.id}</Link>
                    </td>
                    <td className="px-5 py-4">{run.scenario_type}</td>
                    <td className="px-5 py-4 text-muted">{formatDateTime(run.date)}</td>
                    <td className="px-5 py-4">{run.passed}</td>
                    <td className="px-5 py-4">{run.failed}</td>
                    <td className="px-5 py-4">{run.avg_safety_score.toFixed(1)}</td>
                    <td className="px-5 py-4">{run.reaction_time_ms} ms</td>
                    <td className="px-5 py-4"><StatusBadge status={run.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        className="inline-flex min-h-8 items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => onDelete(run.id)}
                        disabled={deletingRunId === run.id}
                        aria-label={`Delete ${run.id}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        {deletingRunId === run.id ? "Deleting" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
