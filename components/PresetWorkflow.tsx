"use client";

import { useMemo, useState } from "react";
import { createGatewayClient } from "@/lib/gateway/client";
import type { WorkflowDefinition } from "@/lib/types";
import { MockBadge } from "./MockBadge";
import { renderTemplate } from "@/lib/seed-client";

export function PresetWorkflow({
  workflow,
  model,
  caller,
}: {
  workflow: WorkflowDefinition;
  model: string;
  caller: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const input of workflow.inputs) {
      initial[input.id] = input.defaultValue ?? "";
    }
    return initial;
  });
  const [output, setOutput] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    cost: number | null;
    correlationId: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => createGatewayClient(), []);

  async function run() {
    setBusy(true);
    setError(null);
    const prompt =
      renderTemplate(workflow.promptTemplate, values) +
      "\n" +
      Object.entries(values)
        .map(([k, v]) => `[input:${k}] ${v}`)
        .join("\n");

    try {
      const result = await client.complete({
        input: prompt,
        model,
        caller,
        workspaceId: workflow.workspaceId,
        workflowId: workflow.id,
      });
      if (result.status === "error") {
        setError(result.error?.detail ?? "Workflow failed");
        setOutput(null);
      } else {
        setOutput(result.output);
        setMeta({
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cost: result.cost,
          correlationId: result.correlationId,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#0d2240] p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-white">{workflow.name}</h3>
          <p className="mt-1 text-sm text-cyan-100/70">{workflow.description}</p>
        </div>
        <MockBadge label="Scripted workflow" />
      </div>

      <p className="mb-4 text-xs text-cyan-200/60">
        Source:{" "}
        <a
          href={workflow.source.url}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {workflow.source.label}
        </a>
      </p>

      <div className="space-y-3">
        {workflow.inputs.map((input) => (
          <label key={input.id} className="block text-sm">
            <span className="mb-1 block text-cyan-100/80">{input.label}</span>
            {input.type === "select" ? (
              <select
                className="w-full rounded border border-white/15 bg-[#071628] px-3 py-2 text-white"
                value={values[input.id]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [input.id]: e.target.value }))
                }
              >
                {(input.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : input.type === "textarea" ? (
              <textarea
                className="min-h-28 w-full rounded border border-white/15 bg-[#071628] px-3 py-2 font-mono text-sm text-white"
                value={values[input.id]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [input.id]: e.target.value }))
                }
              />
            ) : (
              <input
                className="w-full rounded border border-white/15 bg-[#071628] px-3 py-2 text-white"
                value={values[input.id]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [input.id]: e.target.value }))
                }
              />
            )}
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={run}
        className="mt-4 rounded bg-cyan-500 px-4 py-2 text-sm font-medium text-[#04101f] hover:bg-cyan-400 disabled:opacity-50"
      >
        {busy ? "Running via gateway…" : "Run through gateway"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {output && (
        <div className="mt-4 rounded border border-white/10 bg-[#071628] p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <MockBadge label="Scripted output" />
            <MockBadge label="Simulated tokens/cost" />
          </div>
          <pre className="whitespace-pre-wrap text-sm text-cyan-50">{output}</pre>
          {meta && (
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-cyan-200/70 sm:grid-cols-4">
              <div>
                <dt>Model</dt>
                <dd className="text-cyan-100">{meta.model}</dd>
              </div>
              <div>
                <dt>Tokens (sim)</dt>
                <dd className="text-cyan-100">
                  {meta.inputTokens} → {meta.outputTokens}
                </dd>
              </div>
              <div>
                <dt>Cost (sim)</dt>
                <dd className="text-cyan-100">
                  {meta.cost === null ? "n/a" : `$${meta.cost.toFixed(6)}`}
                </dd>
              </div>
              <div>
                <dt>Correlation</dt>
                <dd className="truncate text-cyan-100">{meta.correlationId}</dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
