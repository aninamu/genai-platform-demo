"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createGatewayClient } from "@/lib/gateway/client";
import type { GatewayCitation } from "@/lib/gateway/contracts";
import {
  getAgentApprovals,
  setAgentApproved,
  setAgentMobileSession,
} from "@/lib/demo-store";
import { getAgentsClient } from "@/lib/seed-client";
import { isLiveModel, GROK_MODEL_ID } from "@/lib/models";
import type { AgentDefinition, AgentStepDefinition } from "@/lib/types";
import { MockBadge } from "./MockBadge";
import { ModelPicker } from "./ModelPicker";

interface StepResult {
  output: string;
  correlationId?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number | null;
  simulated?: boolean;
  citations?: GatewayCitation[];
  error?: string;
}

export function AgentsDesk() {
  const agents = useMemo(() => getAgentsClient(), []);
  const [selectedId, setSelectedId] = useState(agents[0]?.id ?? "");
  const selected = agents.find((a) => a.id === selectedId) ?? agents[0];
  const [model, setModel] = useState(selected?.defaultModel ?? GROK_MODEL_ID);
  const [busy, setBusy] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [approvals, setApprovals] = useState<Record<string, boolean>>(() =>
    typeof window === "undefined" ? {} : getAgentApprovals(),
  );
  const [noticeSent, setNoticeSent] = useState(false);
  const client = useMemo(() => createGatewayClient(), []);

  function selectAgent(agent: AgentDefinition) {
    setSelectedId(agent.id);
    setModel(agent.defaultModel);
    setActiveStepId(null);
    setNoticeSent(false);
  }

  async function runStep(agent: AgentDefinition, step: AgentStepDefinition) {
    if (busy) return;
    if (step.requiresPriorApproval && !approvals[agent.id]) {
      setResults((prev) => ({
        ...prev,
        [step.id]: {
          output: "",
          error: "Approve the draft playbook before querying it.",
        },
      }));
      setActiveStepId(step.id);
      return;
    }

    setBusy(true);
    setActiveStepId(step.id);
    try {
      const result = await client.complete({
        input: step.input,
        model,
        caller: agent.caller,
        workspaceId: agent.workspaceId,
        agentStepId: step.id,
      });

      if (result.status === "error") {
        setResults((prev) => ({
          ...prev,
          [step.id]: {
            output: "",
            error: result.error?.detail ?? "Gateway error",
            correlationId: result.correlationId,
            model: result.model,
            simulated: result.simulated,
          },
        }));
        return;
      }

      const stepResult: StepResult = {
        output: result.output,
        correlationId: result.correlationId,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: result.cost,
        simulated: result.simulated,
        citations: result.citations,
      };
      setResults((prev) => ({ ...prev, [step.id]: stepResult }));

      if (agent.supportsMobile) {
        setAgentMobileSession({
          agentId: agent.id,
          agentName: agent.name,
          stepId: step.id,
          model: result.model,
          output: result.output,
          correlationId: result.correlationId,
          cost: result.cost,
          simulated: result.simulated,
          citations: result.citations?.map((c) => ({
            documentId: c.documentId,
            title: c.title,
            snippet: c.snippet,
          })),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [step.id]: {
          output: "",
          error: err instanceof Error ? err.message : "Request failed",
        },
      }));
    } finally {
      setBusy(false);
    }
  }

  function approve(agent: AgentDefinition) {
    setAgentApproved(agent.id, true);
    setApprovals((prev) => ({ ...prev, [agent.id]: true }));
    if (agent.id === "corporate-action") {
      setNoticeSent(true);
    }
  }

  if (!selected) {
    return <p className="text-sm text-cyan-100/60">No agents configured.</p>;
  }

  const activeResult = activeStepId ? results[activeStepId] : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agents</h1>
          <p className="mt-1 max-w-2xl text-sm text-cyan-100/70">
            BDK-shaped desk inside the GenAI workbench. Grok Bot is not embedded
            natively — these skills emulate the workflows Nasdaq asked for,
            with every model turn traced through the gateway.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <MockBadge label="BDK layout in repo" />
            <MockBadge label="Not native Grok Bot embed" />
          </div>
        </div>
        <ModelPicker value={model} onChange={setModel} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          {agents.map((agent) => {
            const active = agent.id === selected.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => selectAgent(agent)}
                className={`w-full rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-cyan-400 bg-[#0d2240]"
                    : "border-white/10 bg-[#0a1628] hover:border-white/25"
                }`}
              >
                <div className="text-sm font-medium text-white">{agent.name}</div>
                <p className="mt-1 text-xs text-cyan-100/60">{agent.description}</p>
                <p className="mt-2 font-mono text-[10px] text-cyan-200/50">
                  {agent.caller}
                </p>
              </button>
            );
          })}
        </aside>

        <section className="space-y-4 rounded-lg border border-white/10 bg-[#0d2240] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-white">{selected.name}</h2>
              <p className="mt-1 text-xs text-cyan-100/60">
                Skill:{" "}
                <span className="font-mono text-cyan-200/80">
                  {selected.skillPath}
                </span>
              </p>
            </div>
            {isLiveModel(model) ? (
              <MockBadge
                label="Grok path (live or scripted fallback)"
                className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              />
            ) : (
              <MockBadge label="Bedrock (simulated)" />
            )}
          </div>

          <ol className="space-y-3">
            {selected.steps.map((step, index) => {
              const locked =
                Boolean(step.requiresPriorApproval) && !approvals[selected.id];
              const done = Boolean(results[step.id]?.output);
              return (
                <li
                  key={step.id}
                  className="rounded border border-white/10 bg-[#071628] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-cyan-200/50">
                        Step {index + 1}
                      </span>
                      <div className="text-sm font-medium text-white">
                        {step.label}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy || locked}
                      onClick={() => void runStep(selected, step)}
                      className="rounded bg-cyan-500 px-3 py-1.5 text-xs font-medium text-[#04101f] disabled:opacity-50"
                    >
                      {busy && activeStepId === step.id
                        ? "Running…"
                        : done
                          ? "Re-run"
                          : "Run"}
                    </button>
                  </div>
                  {locked && (
                    <p className="mt-2 text-xs text-amber-200/90">
                      Approve the prior draft before this step unlocks.
                    </p>
                  )}
                  {step.approvalGate && results[step.id]?.output && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {approvals[selected.id] ? (
                        <MockBadge
                          label={
                            selected.id === "corporate-action" && noticeSent
                              ? "Approved · notice marked sent (demo)"
                              : "Approved · playbook live"
                          }
                          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => approve(selected)}
                          className="rounded border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 hover:bg-amber-500/20"
                        >
                          {selected.id === "corporate-action"
                            ? "Approve & mark sent"
                            : "Approve playbook"}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {selected.supportsMobile && (
            <div className="flex flex-wrap items-center gap-3 rounded border border-white/10 bg-[#071628] px-3 py-2">
              <p className="text-xs text-cyan-100/70">
                After a run, open the phone handoff to check the brief on mobile.
              </p>
              <Link
                href="/agents/mobile"
                className="rounded border border-cyan-400/40 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/10"
              >
                Open phone handoff
              </Link>
            </div>
          )}

          <div className="rounded border border-white/10 bg-[#071628] p-3">
            <h3 className="text-sm font-medium text-white">Run output</h3>
            {!activeResult && (
              <p className="mt-2 text-sm text-cyan-100/50">
                Run a step to see the artifact, citations, and gateway metadata.
              </p>
            )}
            {activeResult?.error && (
              <p className="mt-2 text-sm text-red-300" role="alert">
                {activeResult.error}
              </p>
            )}
            {activeResult?.output && (
              <div className="mt-2 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {activeResult.simulated === false ? (
                    <MockBadge
                      label="Live xAI"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    />
                  ) : (
                    <MockBadge label="Scripted BDK response" />
                  )}
                  {model === GROK_MODEL_ID &&
                    activeResult.output.includes("X context") && (
                      <MockBadge
                        label="X context included"
                        className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      />
                    )}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-cyan-50">
                  {activeResult.output}
                </pre>
                <p className="text-[11px] text-cyan-200/50">
                  {activeResult.model} · {activeResult.inputTokens}→
                  {activeResult.outputTokens} tok
                  {activeResult.simulated === false ? "" : " (sim)"} ·{" "}
                  {activeResult.cost === null || activeResult.cost === undefined
                    ? "cost n/a"
                    : `$${activeResult.cost.toFixed(6)}`}{" "}
                  · {activeResult.correlationId}
                </p>
                {activeResult.citations && activeResult.citations.length > 0 && (
                  <div>
                    <p className="text-xs text-cyan-200/60">Citations</p>
                    <ul className="mt-1 space-y-1">
                      {activeResult.citations.map((c) => (
                        <li
                          key={`${c.documentId}-${c.score}`}
                          className="rounded border border-white/10 px-2 py-1 text-xs text-cyan-100/80"
                        >
                          <span className="font-medium text-cyan-50">
                            {c.title}
                          </span>
                          <span className="mt-0.5 block text-cyan-100/50">
                            {c.snippet}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-cyan-100/50">
                  Switch to{" "}
                  <Link href="/traces" className="text-cyan-200 underline">
                    Traces
                  </Link>{" "}
                  (admin) to show model, tokens, and cost in the gateway.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
