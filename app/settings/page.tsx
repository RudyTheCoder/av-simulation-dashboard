import { Panel, PanelHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Settings</h1>
        <p className="mt-2 text-sm text-muted">Local environment and API configuration.</p>
      </div>

      <Panel>
        <PanelHeader title="Environment" subtitle="Values used by the frontend and backend during local development" />
        <dl className="grid gap-4 p-5 md:grid-cols-2">
          <div className="rounded-md border border-border p-4">
            <dt className="text-sm font-semibold">Frontend API base URL</dt>
            <dd className="mt-2 break-all font-mono text-sm text-muted">NEXT_PUBLIC_API_BASE_URL=http://localhost:8001</dd>
          </div>
          <div className="rounded-md border border-border p-4">
            <dt className="text-sm font-semibold">Backend database URL</dt>
            <dd className="mt-2 break-all font-mono text-sm text-muted">DATABASE_URL=postgresql+psycopg://av_user:av_password@localhost:5433/av_sim_dashboard</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
