"use client";

import { useCallback, useEffect, useState } from "react";
import type { GatewayClient } from "@/lib/gateway/client";
import type { UsageSource, UsageSummary } from "@/lib/gateway/contracts";
import { getModelOption } from "@/lib/models";
import { MockBadge } from "./MockBadge";

const SOURCES: { id: UsageSource; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sample", label: "Sample history" },
  { id: "live", label: "Live only" },
];

function usd(value: number | null): string {
  return value === null ? "n/a" : `$${value.toFixed(4)}`;
}

export function TrafficByModel({
  client,
  refreshKey,
  onSeeded,
}: {
  client: GatewayClient;
  refreshKey: number;
  onSeeded: () => void;
}) {
  const [source, setSource] = useState<UsageSource>("all");
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(async () => {
    try {
      setSummary(await client.getUsage(source));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load usage");
    }
  }, [client, source]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function seed() {
    setSeeding(true);
    try {
      await client.seedSampleTraffic();
      onSeeded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed sample history");
    } finally {
      setSeeding(false);
    }
  }

  const maxShare = Math.max(0, ...(summary?.byModel.map((m) => m.share) ?? []));

  return (
    <section className="rounded-lg border border-white/10 bg-[#0d2240] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Traffic by model</h2>
          <p className="mt-1 text-xs text-cyan-100/60">
            Aggregated from gateway traces: request share, cost, and average
            latency per model.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded border border-white/15 p-0.5 text-xs">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`rounded px-2 py-1 ${source === s.id ? "bg-cyan-500 text-[#04101f]" : "text-cyan-100"}`}
                onClick={() => setSource(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={seeding}
            className="rounded border border-white/20 px-3 py-1 text-xs text-cyan-100 hover:bg-white/10 disabled:opacity-50"
            onClick={() => void seed()}
          >
            {seeding ? "Seeding…" : "Load / reset sample history"}
          </button>
        </div>
      </div>

      {summary && summary.sampleRequests > 0 && (
        <p className="mb-3 flex flex-wrap items-center gap-2 text-xs text-amber-100/80">
          <MockBadge label="Sample data" />
          {summary.sampleRequests} of {summary.totalRequests} requests are
          seeded sample history (synthetic usage, no model was called).
        </p>
      )}

      {error && (
        <p className="mb-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead className="border-b border-white/10 text-xs text-cyan-200/60">
          <tr>
            <th className="px-2 py-2">Model</th>
            <th className="px-2 py-2">Requests</th>
            <th className="w-1/4 px-2 py-2">Traffic share</th>
            <th className="px-2 py-2">Total cost</th>
            <th className="px-2 py-2">Avg cost / req</th>
            <th className="px-2 py-2">Avg latency</th>
          </tr>
        </thead>
        <tbody>
          {!summary || summary.byModel.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-2 py-6 text-cyan-100/50">
                No traffic in this selection. Run a chat or load sample history.
              </td>
            </tr>
          ) : (
            summary.byModel.map((m) => {
              const option = getModelOption(m.model);
              return (
                <tr key={m.model} className="border-b border-white/5">
                  <td className="px-2 py-2">
                    <div className="text-cyan-50">{option?.label ?? m.model}</div>
                    <div className="text-[11px] text-cyan-200/50">{m.model}</div>
                  </td>
                  <td className="px-2 py-2">
                    {m.requests}
                    {m.errors > 0 && (
                      <span className="ml-1 text-[11px] text-red-300">
                        ({m.errors} err)
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded bg-white/5">
                        <div
                          className={`h-2 rounded ${option?.provider === "xai" ? "bg-emerald-400" : "bg-cyan-400"}`}
                          style={{
                            width: `${maxShare ? (m.share / maxShare) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs">
                        {(m.share * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2">{usd(m.totalCost)}</td>
                  <td className="px-2 py-2">
                    {usd(m.avgCostPerRequest)}
                    {m.unpricedRequests > 0 && (
                      <span className="ml-1 text-[11px] text-cyan-200/50">
                        ({m.unpricedRequests} unpriced)
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2">{m.avgLatencyMs.toLocaleString()} ms</td>
                </tr>
              );
            })
          )}
        </tbody>
        {summary && summary.byModel.length > 0 && (
          <tfoot className="text-xs text-cyan-200/70">
            <tr>
              <td className="px-2 py-2">Total</td>
              <td className="px-2 py-2">{summary.totalRequests}</td>
              <td className="px-2 py-2">100%</td>
              <td className="px-2 py-2">{usd(summary.totalCost)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        )}
      </table>
    </section>
  );
}
