"use client";

import { MockBadge } from "./MockBadge";
import type { GatewayCitation } from "@/lib/gateway/contracts";

export function RetrievalPanel({
  citations,
  latencyHint,
}: {
  citations: GatewayCitation[];
  latencyHint?: number;
}) {
  return (
    <aside className="flex h-full flex-col rounded-lg border border-white/10 bg-[#0d2240]">
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Retrieval</h2>
          <MockBadge label="Simulated retrieval — not NVIDIA NeMo" />
        </div>
        {typeof latencyHint === "number" && (
          <p className="mt-1 text-[11px] text-cyan-200/60">
            Gateway latency (sim): {latencyHint} ms
          </p>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-3">
        {citations.length === 0 ? (
          <p className="text-sm text-cyan-100/50">
            Citations from the last answer appear here.
          </p>
        ) : (
          citations.map((c) => (
            <article
              key={`${c.documentId}-${c.score}`}
              className="rounded border border-white/10 bg-[#071628] p-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-cyan-50">
                  {c.title.replace(/^Synthetic sample document — /, "")}
                </h3>
                <span className="text-[11px] text-cyan-300/70">
                  score {(c.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-cyan-100/70">{c.snippet}</p>
            </article>
          ))
        )}
      </div>
    </aside>
  );
}
