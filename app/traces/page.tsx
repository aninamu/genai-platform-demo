"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { MockBadge } from "@/components/MockBadge";
import { TrafficByModel } from "@/components/TrafficByModel";
import { createGatewayClient } from "@/lib/gateway/client";
import type { GatewayTrace } from "@/lib/gateway/contracts";

function TracesContent() {
  const client = useMemo(() => createGatewayClient(), []);
  const [traces, setTraces] = useState<GatewayTrace[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<GatewayTrace | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(
    async (cursor?: string) => {
      try {
        const result = await client.listTraces({ cursor, limit: 25 });
        setTraces((prev) => (cursor ? [...prev, ...result.data] : result.data));
        setNextCursor(result.paging.nextCursor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load traces");
      }
    },
    [client],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refreshAll = useCallback(() => {
    void load();
    setRefreshKey((k) => k + 1);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Gateway traces</h1>
          <p className="mt-1 text-sm text-cyan-100/70">
            Prompts routed through the gateway. Claude usage and cost are
            simulated; Grok traces carry real xAI token counts and cost. Agent
            desk runs use callers like <code>bdk:meeting-prep</code>.
          </p>
        </div>
        <div className="flex gap-2">
          <MockBadge label="Simulated Claude tokens/cost" />
          <button
            type="button"
            className="rounded border border-white/20 px-3 py-1 text-xs text-cyan-100 hover:bg-white/10"
            onClick={refreshAll}
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="rounded border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
        Commercial note (talk track): once the legal addendum is signed, Grok
        and Grok Bot usage on this gateway counts toward the existing $600K xAI
        commit. This page shows per-request model, tokens, and cost — it does
        not calculate that commitment.
      </p>

      {error && (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      <TrafficByModel
        client={client}
        refreshKey={refreshKey}
        onSeeded={refreshAll}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d2240]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs text-cyan-200/60">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Caller</th>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Tokens</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {traces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-cyan-100/50">
                    No traces yet. Run a chat or workflow first.
                  </td>
                </tr>
              ) : (
                traces.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                    onClick={() => setSelected(t)}
                  >
                    <td className="px-3 py-2 text-xs text-cyan-100/80">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{t.caller}</td>
                    <td className="px-3 py-2 text-xs">
                      {t.model}
                      {t.sample && <MockBadge label="Sample" className="ml-1" />}
                      {!t.simulated && (
                        <MockBadge
                          label="Live"
                          className="ml-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {t.inputTokens}→{t.outputTokens}
                    </td>
                    <td className="px-3 py-2">
                      {t.cost === null ? "n/a" : `$${t.cost.toFixed(6)}`}
                    </td>
                    <td className="px-3 py-2">{t.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {nextCursor && (
            <button
              type="button"
              className="w-full border-t border-white/10 py-2 text-xs text-cyan-200 hover:bg-white/5"
              onClick={() => void load(nextCursor)}
            >
              Load more
            </button>
          )}
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0d2240] p-4">
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {selected.sample ? (
                  <MockBadge label="Sample history" />
                ) : selected.simulated ? (
                  <MockBadge label="Simulated" />
                ) : (
                  <MockBadge
                    label={`Live xAI · ${selected.providerModel ?? selected.model}`}
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  />
                )}
                <span className="text-xs text-cyan-200/60">
                  {selected.correlationId}
                </span>
              </div>
              <div>
                <h3 className="text-xs uppercase text-cyan-200/50">Input</h3>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-[#071628] p-2 text-cyan-50">
                  {selected.input}
                </pre>
              </div>
              <div>
                <h3 className="text-xs uppercase text-cyan-200/50">Output</h3>
                <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-[#071628] p-2 text-cyan-50">
                  {selected.output || selected.error?.detail || "(empty)"}
                </pre>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs text-cyan-200/70">
                <div>
                  <dt>Workspace</dt>
                  <dd className="text-cyan-100">{selected.workspaceId ?? "—"}</dd>
                </div>
                <div>
                  <dt>Workflow</dt>
                  <dd className="text-cyan-100">{selected.workflowId ?? "—"}</dd>
                </div>
                <div>
                  <dt>Latency</dt>
                  <dd className="text-cyan-100">{selected.latencyMs} ms</dd>
                </div>
                <div>
                  <dt>Currency</dt>
                  <dd className="text-cyan-100">{selected.currency}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p className="text-sm text-cyan-100/50">Select a trace to inspect.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TracesPage() {
  return (
    <RequireAuth allow={["admin"]}>
      {() => <TracesContent />}
    </RequireAuth>
  );
}
