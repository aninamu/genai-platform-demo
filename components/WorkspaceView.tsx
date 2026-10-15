"use client";

import { useEffect, useMemo, useState } from "react";
import { createGatewayClient } from "@/lib/gateway/client";
import type { GatewayCitation } from "@/lib/gateway/contracts";
import {
  addUpload,
  getChat,
  getUploads,
  setChat,
} from "@/lib/demo-store";
import type {
  ChatMessage,
  SeedDocument,
  UploadedDocument,
  WorkflowDefinition,
  Workspace,
} from "@/lib/types";
import { DocumentLibrary } from "./DocumentLibrary";
import { MockBadge } from "./MockBadge";
import { PresetWorkflow } from "./PresetWorkflow";
import { RetrievalPanel } from "./RetrievalPanel";

export function WorkspaceView({
  workspace,
  seedDocs,
  workflows,
  caller,
}: {
  workspace: Workspace;
  seedDocs: SeedDocument[];
  workflows: WorkflowDefinition[];
  caller: string;
}) {
  const [tab, setTab] = useState<"chat" | "workflows">("chat");
  const [uploads, setUploads] = useState<UploadedDocument[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [citations, setCitations] = useState<GatewayCitation[]>([]);
  const [latency, setLatency] = useState<number | undefined>();
  const client = useMemo(() => createGatewayClient(), []);

  useEffect(() => {
    setUploads(getUploads(workspace.id));
    setMessages(getChat(workspace.id));
  }, [workspace.id]);

  function handleUpload(doc: UploadedDocument) {
    addUpload(doc);
    setUploads(getUploads(workspace.id));
  }

  async function send(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    const next = [...messages, userMsg];
    setMessages(next);

    try {
      const result = await client.complete({
        input: text,
        model: workspace.model,
        caller,
        workspaceId: workspace.id,
        documents: uploads.map((u) => ({
          id: u.id,
          name: u.name,
          content: u.content,
        })),
        stream: true,
      });

      const assistant: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content:
          result.status === "error"
            ? result.error?.detail ?? "Error"
            : result.output,
        citations: result.citations?.map((c) => c.documentId),
        correlationId: result.correlationId,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cost: result.cost,
        simulated: true,
      };
      const withAssistant = [...next, assistant];
      setMessages(withAssistant);
      setChat(workspace.id, withAssistant);
      setCitations(result.citations ?? []);
      setLatency(result.latencyMs);
    } catch (err) {
      const assistant: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: err instanceof Error ? err.message : "Request failed",
      };
      const withAssistant = [...next, assistant];
      setMessages(withAssistant);
      setChat(workspace.id, withAssistant);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">{workspace.name}</h1>
          <p className="mt-1 text-sm text-cyan-100/70">{workspace.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <MockBadge label={`Model: ${workspace.model} (simulated)`} />
            <MockBadge label="Bedrock (simulated)" />
          </div>
        </div>
        <div className="flex rounded border border-white/15 p-1 text-sm">
          <button
            type="button"
            className={`rounded px-3 py-1 ${tab === "chat" ? "bg-cyan-500 text-[#04101f]" : "text-cyan-100"}`}
            onClick={() => setTab("chat")}
          >
            Chat
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 ${tab === "workflows" ? "bg-cyan-500 text-[#04101f]" : "text-cyan-100"}`}
            onClick={() => setTab("workflows")}
          >
            Workflows
          </button>
        </div>
      </div>

      {tab === "chat" ? (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_260px]">
          <DocumentLibrary
            workspaceId={workspace.id}
            seedDocs={seedDocs}
            uploads={uploads}
            onUpload={handleUpload}
          />

          <section className="flex min-h-[520px] flex-col rounded-lg border border-white/10 bg-[#0d2240]">
            <div className="flex-1 space-y-3 overflow-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-cyan-100/60">Suggested prompts</p>
                  <div className="flex flex-wrap gap-2">
                    {workspace.suggestedPrompts.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="rounded border border-white/15 px-3 py-1.5 text-left text-xs text-cyan-50 hover:bg-white/5"
                        onClick={() => send(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-8 bg-cyan-700/30 text-cyan-50"
                      : "mr-8 bg-[#071628] text-cyan-50"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      <MockBadge label="Scripted response" />
                      {typeof m.cost === "number" && (
                        <MockBadge label="Simulated tokens/cost" />
                      )}
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
                  {m.role === "assistant" && m.model && (
                    <p className="mt-2 text-[11px] text-cyan-200/50">
                      {m.model} · {m.inputTokens}→{m.outputTokens} tok (sim) ·{" "}
                      {m.cost === null || m.cost === undefined
                        ? "cost n/a"
                        : `$${m.cost.toFixed(6)}`}{" "}
                      · {m.correlationId}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <form
              className="flex gap-2 border-t border-white/10 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <input
                className="flex-1 rounded border border-white/15 bg-[#071628] px-3 py-2 text-sm text-white"
                placeholder="Ask about documents…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="rounded bg-cyan-500 px-4 py-2 text-sm font-medium text-[#04101f] disabled:opacity-50"
              >
                {busy ? "…" : "Send"}
              </button>
            </form>
          </section>

          <RetrievalPanel citations={citations} latencyHint={latency} />
        </div>
      ) : (
        <div className="space-y-4">
          {workflows.length === 0 ? (
            <p className="text-sm text-cyan-100/60">No workflows for this workspace.</p>
          ) : (
            workflows.map((wf) => (
              <PresetWorkflow
                key={wf.id}
                workflow={wf}
                model={workspace.model}
                caller={caller}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
