"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { getRun } from "@/lib/api";
import type { TestRunDetail } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { ErrorPanel, LoadingPanel, Panel, PanelHeader, SeverityBadge, StatusBadge } from "@/components/ui";

export default function ScenarioDetailPage() {
  const params = useParams<{ id: string }>();
  const [run, setRun] = useState<TestRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    getRun(params.id)
      .then(setRun)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingPanel label="Loading scenario detail" />;
  if (error) return <ErrorPanel message={error} />;
  if (!run) return <ErrorPanel message="Scenario not found." />;

  return (
    <div className="space-y-6">
      <Link href="/test-runs" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to test runs
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">{run.id}</h1>
          <p className="mt-2 text-sm text-muted">{run.scenario_type} started {formatDateTime(run.detail?.start_time ?? run.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={run.status} />
          <SeverityBadge severity={run.detail?.severity} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Total Scenarios", run.total_scenarios],
          ["Passed", run.passed],
          ["Failed", run.failed],
          ["Safety Score", run.avg_safety_score.toFixed(1)],
        ].map(([label, value]) => (
          <Panel key={label} className="p-5">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Panel>
        ))}
      </div>

      {run.detail?.failure_reason ? (
        <Panel className="p-5">
          <p className="text-sm font-semibold">Failure Reason</p>
          <p className="mt-2 text-sm text-muted">{run.detail.failure_reason}</p>
        </Panel>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <PanelHeader title="Evaluation Timeline" subtitle="Key signals emitted during the simulation" />
          <div className="divide-y divide-border">
            {run.timeline_events.map((event) => (
              <div key={event.id} className="flex gap-4 px-5 py-4">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
                <div>
                  <p className="text-sm font-semibold">{event.time} · {event.label}</p>
                  <p className="mt-1 text-sm text-muted">{event.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Metric Rows" subtitle="Threshold checks from the evaluator" />
          <div className="table-scroll overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-surface text-xs uppercase text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Metric</th>
                  <th className="px-5 py-3 font-semibold">Value</th>
                  <th className="px-5 py-3 font-semibold">Threshold</th>
                  <th className="px-5 py-3 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {run.metric_rows.map((metric) => (
                  <tr key={metric.id}>
                    <td className="px-5 py-4 font-medium">{metric.metric}</td>
                    <td className="px-5 py-4">{metric.value}</td>
                    <td className="px-5 py-4 text-muted">{metric.threshold}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-sm font-medium">
                        {metric.result === "pass" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                        {metric.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Review Notes" subtitle="Human reviewer observations attached to the run" />
        <div className="divide-y divide-border">
          {run.review_notes.map((note) => (
            <div key={note.id} className="px-5 py-4">
              <p className="text-sm font-semibold">{note.author} · <span className="text-muted">{note.time}</span></p>
              <p className="mt-1 text-sm text-muted">{note.text}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
