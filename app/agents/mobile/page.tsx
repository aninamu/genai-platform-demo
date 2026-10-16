"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MockBadge } from "@/components/MockBadge";
import { RequireAuth } from "@/components/RequireAuth";
import { getAgentMobileSession } from "@/lib/demo-store";
import type { AgentMobileSession } from "@/lib/types";

function MobileHandoff() {
  const [session, setSession] = useState<AgentMobileSession | null>(null);

  useEffect(() => {
    setSession(getAgentMobileSession());
  }, []);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
      <div className="w-full text-center">
        <h1 className="text-2xl font-semibold text-white">Phone handoff</h1>
        <p className="mt-1 text-sm text-cyan-100/70">
          Same research brief, phone-sized. Voice waits on Nasdaq&apos;s mobile
          app.
        </p>
        <div className="mt-2 flex justify-center gap-2">
          <MockBadge label="Desktop → mobile" />
          <Link
            href="/agents"
            className="text-xs text-cyan-200 underline hover:text-white"
          >
            Back to Agents
          </Link>
        </div>
      </div>

      <div className="relative w-[320px] rounded-[2rem] border-4 border-white/20 bg-[#04101f] p-3 shadow-2xl shadow-cyan-950/40">
        <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-white/20" />
        <div className="min-h-[520px] overflow-auto rounded-2xl bg-[#0d2240] p-4">
          {!session ? (
            <div className="space-y-3 text-sm text-cyan-100/70">
              <p>No research session yet.</p>
              <p>
                Run <strong className="text-cyan-50">Desktop research → phone</strong>{" "}
                or <strong className="text-cyan-50">Exec / client meeting prep</strong>{" "}
                on the Agents tab, then reopen this view.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-cyan-200/50">
                  {session.agentName}
                </p>
                <p className="text-xs text-cyan-100/50">
                  {new Date(session.updatedAt).toLocaleString()}
                </p>
              </div>
              {session.simulated === false ? (
                <MockBadge
                  label="Live xAI"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                />
              ) : (
                <MockBadge label="Scripted BDK response" />
              )}
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-cyan-50">
                {session.output}
              </pre>
              {session.citations && session.citations.length > 0 && (
                <div className="space-y-1 border-t border-white/10 pt-3">
                  <p className="text-[10px] uppercase text-cyan-200/50">
                    Citations
                  </p>
                  {session.citations.map((c) => (
                    <p
                      key={c.documentId}
                      className="text-xs text-cyan-100/70"
                    >
                      {c.title}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-cyan-200/40">
                {session.model}
                {session.cost != null ? ` · $${session.cost.toFixed(6)}` : ""}
                {session.correlationId ? ` · ${session.correlationId}` : ""}
              </p>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 px-1">
          <button
            type="button"
            disabled
            title="Grok voice waits on Nasdaq’s mobile app"
            className="flex-1 rounded-full border border-white/15 px-3 py-2 text-xs text-cyan-100/40"
          >
            Voice (pending)
          </button>
          <MockBadge label="Needs Nasdaq mobile app" />
        </div>
      </div>
    </div>
  );
}

export default function AgentsMobilePage() {
  return <RequireAuth>{() => <MobileHandoff />}</RequireAuth>;
}
