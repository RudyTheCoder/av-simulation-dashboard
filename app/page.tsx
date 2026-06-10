"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock, Plus, ShieldCheck, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { generateRun, getFailuresByScenario, getPassFailTrend, getRuns, getSummary } from "@/lib/api";
import type { FailuresByScenarioPoint, PassFailTrendPoint, SummaryMetric, TestRun } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Button, ErrorPanel, LoadingPanel, Panel, PanelHeader, StatusBadge } from "@/components/ui";

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryMetric | null>(null);
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [trend, setTrend] = useState<PassFailTrendPoint[]>([]);
  const [failuresByScenario, setFailuresByScenario] = useState<FailuresByScenarioPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadDashboard() {
    setError(null);
    const [summaryData, runData, trendData, scenarioData] = await Promise.all([
      getSummary(),
      getRuns(),
      getPassFailTrend(),
      getFailuresByScenario(),
    ]);
    setSummary(summaryData);
    setRuns(runData.slice(0, 6));
    setTrend(trendData);
    setFailuresByScenario(scenarioData);
  }

  useEffect(() => {
    loadDashboard()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function onGenerate() {
    setGenerating(true);
    setNotice(null);
    setError(null);
    try {
      const run = await generateRun();
      setNotice(`${run.id} generated and stored.`);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate test run.");
    } finally {
      setGenerating(false);
    }
  }

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: "Total Test Runs",
        value: summary.total_test_runs.toLocaleString(),
        delta: `${summary.pass_rate_delta >= 0 ? "+" : ""}${summary.pass_rate_delta.toFixed(1)}% pass trend`,
        icon: Activity,
      },
      {
        label: "Pass Rate",
        value: `${summary.pass_rate.toFixed(1)}%`,
        delta: `${summary.pass_rate_delta >= 0 ? "+" : ""}${summary.pass_rate_delta.toFixed(1)}% vs prior`,
        icon: ShieldCheck,
      },
      {
        label: "Failed Scenarios",
        value: summary.failed_scenarios.toLocaleString(),
        delta: `${summary.failed_scenarios_delta >= 0 ? "+" : ""}${summary.failed_scenarios_delta} in latest window`,
        icon: AlertTriangle,
      },
      {
        label: "Avg Reaction Time",
        value: `${summary.average_reaction_time_ms.toFixed(0)} ms`,
        delta: `${summary.reaction_time_delta_ms >= 0 ? "+" : ""}${summary.reaction_time_delta_ms.toFixed(0)} ms trend`,
        icon: Clock,
      },
    ];
  }, [summary]);

  if (loading) return <LoadingPanel label="Loading dashboard" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Autonomous vehicle simulation</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-normal">Evaluation Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Track regression health, scenario outcomes, failure modes, and reaction-time performance from PostgreSQL-backed simulation results.
          </p>
        </div>
        <Button onClick={onGenerate} disabled={generating}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {generating ? "Generating" : "Generate Test Run"}
        </Button>
      </div>

      {error ? <ErrorPanel message={error} /> : null}
      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Panel key={card.label} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold">{card.value}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  {card.delta}
                </p>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-md bg-surface text-ink">
                <card.icon className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Panel>
          <PanelHeader title="Pass / Fail Trend" subtitle="Daily aggregated scenario outcomes" />
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="passed" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="failed" stroke="#dc2626" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Failures by Scenario" subtitle="Failure concentration by test family" />
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failuresByScenario} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="scenario_type" type="category" width={126} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="failures" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Recent Test Runs" subtitle="Latest simulations written by the API" />
        <div className="table-scroll overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface text-xs uppercase text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Run</th>
                <th className="px-5 py-3 font-semibold">Scenario</th>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Safety</th>
                <th className="px-5 py-3 font-semibold">Reaction</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-surface/70">
                  <td className="px-5 py-4 font-medium">
                    <Link className="text-accent hover:underline" href={`/scenario/${run.id}`}>
                      {run.id}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{run.scenario_type}</td>
                  <td className="px-5 py-4 text-muted">{formatDateTime(run.date)}</td>
                  <td className="px-5 py-4">{run.avg_safety_score.toFixed(1)}</td>
                  <td className="px-5 py-4">{run.reaction_time_ms} ms</td>
                  <td className="px-5 py-4"><StatusBadge status={run.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
