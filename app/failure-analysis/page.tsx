"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getFailures, getFailuresByScenario } from "@/lib/api";
import type { FailureReason, FailuresByScenarioPoint } from "@/lib/types";
import { ErrorPanel, LoadingPanel, Panel, PanelHeader, SeverityBadge } from "@/components/ui";

export default function FailureAnalysisPage() {
  const [failures, setFailures] = useState<FailureReason[]>([]);
  const [byScenario, setByScenario] = useState<FailuresByScenarioPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getFailures(), getFailuresByScenario()])
      .then(([failureData, scenarioData]) => {
        setFailures(failureData);
        setByScenario(scenarioData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingPanel label="Loading failure analysis" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Failure Analysis</h1>
        <p className="mt-2 text-sm text-muted">Rank recurring failure modes and understand scenario-level concentration.</p>
      </div>

      {error ? <ErrorPanel message={error} /> : null}

      <Panel>
        <PanelHeader title="Failures by Scenario Type" subtitle="Total failed scenarios grouped by scenario family" />
        <div className="h-80 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byScenario} margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="scenario_type" tick={{ fontSize: 11 }} interval={0} angle={-16} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="failures" fill="#0f766e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {failures.map((failure) => (
          <Panel key={failure.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                  <h2 className="text-base font-semibold">{failure.reason}</h2>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{failure.description}</p>
              </div>
              <SeverityBadge severity={failure.severity} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
              <div>
                <p className="text-xs uppercase text-muted">Count</p>
                <p className="mt-1 text-2xl font-semibold">{failure.count}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted">Trend</p>
                <p className="mt-1 flex items-center gap-1 text-2xl font-semibold">
                  {failure.trend >= 0 ? <TrendingUp className="h-5 w-5 text-red-600" /> : <TrendingDown className="h-5 w-5 text-emerald-600" />}
                  {failure.trend >= 0 ? "+" : ""}{failure.trend}%
                </p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
