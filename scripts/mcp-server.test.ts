import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { GatewayTrace, UsageSummary } from "@/lib/gateway/contracts";
import { appendTrace, setTraceStorePathForTests } from "@/lib/gateway/trace-store";
import { server } from "./mcp-server";

function trace(
  id: string,
  workspaceId: string | undefined,
  overrides: Partial<GatewayTrace> = {},
): GatewayTrace {
  return {
    id,
    correlationId: `corr-${id}`,
    createdAt: "2026-10-16T00:00:00.000Z",
    caller: "test",
    workspaceId,
    model: "bedrock-claude-sonnet-sim",
    input: `[synthetic] ${id}`,
    output: "[synthetic] ok",
    inputTokens: 1,
    outputTokens: 1,
    totalTokens: 2,
    cost: 0.01,
    currency: "USD",
    latencyMs: 10,
    status: "success",
    simulated: true,
    ...overrides,
  };
}

const EMPTY = { totalRequests: 0, totalCost: 0, sampleRequests: 0, byModel: [] };

describe("MCP usage_by_model", () => {
  const client = new Client({ name: "usage-test", version: "0.0.0" });

  beforeAll(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-mcp-usage-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
    appendTrace(trace("eng-1", "engineering", { cost: 0.02 }));
    appendTrace(trace("eng-2", "engineering", { cost: 0.03, sample: true }));
    appendTrace(trace("sales-1", "sales", { model: "xai-grok", cost: 0.5 }));
    appendTrace(trace("untagged-1", undefined, { cost: 1 }));
  });

  async function usage(args: Record<string, unknown>): Promise<UsageSummary> {
    const result = await client.callTool({ name: "usage_by_model", arguments: args });
    expect(result.isError).toBeFalsy();
    const [content] = result.content as { type: string; text: string }[];
    return JSON.parse(content.text) as UsageSummary;
  }

  it("admin gets totals across every workspace", async () => {
    const summary = await usage({ role: "admin" });
    expect(summary.totalRequests).toBe(4);
    expect(summary.totalCost).toBeCloseTo(1.55, 6);
    expect(summary.byModel.map((m) => [m.model, m.requests])).toEqual([
      ["bedrock-claude-sonnet-sim", 3],
      ["xai-grok", 1],
    ]);
  });

  it("non-admin gets only their own workspace's usage", async () => {
    const eng = await usage({ role: "engineer", workspaceId: "engineering" });
    expect(eng.totalRequests).toBe(2);
    expect(eng.totalCost).toBeCloseTo(0.05, 6);
    expect(eng.byModel.map((m) => m.model)).toEqual(["bedrock-claude-sonnet-sim"]);

    const sample = await usage({
      role: "engineer",
      workspaceId: "engineering",
      source: "sample",
    });
    expect(sample.totalRequests).toBe(1);
  });

  it("denies cross-workspace reads", async () => {
    expect(await usage({ role: "sales", workspaceId: "engineering" })).toEqual({
      source: "all",
      ...EMPTY,
    });
  });

  it("returns empty usage when the caller is missing or unknown", async () => {
    for (const args of [
      {},
      { source: "live" },
      { workspaceId: "engineering" },
      { role: "engineer" },
      { role: "engineer", workspaceId: "nope" },
    ]) {
      const summary = await usage(args);
      expect(summary).toEqual({ source: args.source ?? "all", ...EMPTY });
    }
  });

  it("rejects a role outside the known set without returning usage", async () => {
    const result = await client.callTool({
      name: "usage_by_model",
      arguments: { role: "superuser", workspaceId: "engineering" },
    });
    expect(result.isError).toBe(true);
    const [content] = result.content as { type: string; text: string }[];
    expect(content.text).not.toContain("totalRequests");
  });
});
