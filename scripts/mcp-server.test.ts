import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GatewayTrace, TraceListResult, UsageSummary } from "@/lib/gateway/contracts";
import { traceCallerFromEnv, type TraceCaller } from "@/lib/gateway/trace-access";
import { appendTrace, setTraceStorePathForTests } from "@/lib/gateway/trace-store";
import { createMcpServer } from "./mcp-server";

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

const clients: Client[] = [];

async function connect(caller: TraceCaller): Promise<Client> {
  const client = new Client({ name: "mcp-test", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    createMcpServer(caller).connect(serverTransport),
    client.connect(clientTransport),
  ]);
  clients.push(client);
  return client;
}

async function callJson<T>(
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const result = await client.callTool({ name, arguments: args });
  expect(result.isError).toBeFalsy();
  const [content] = result.content as { type: string; text: string }[];
  return JSON.parse(content.text) as T;
}

const usage = (client: Client, args: Record<string, unknown> = {}) =>
  callJson<UsageSummary>(client, "usage_by_model", args);
const traceIds = async (client: Client, args: Record<string, unknown> = {}) =>
  (await callJson<TraceListResult>(client, "list_traces", args)).data.map((t) => t.id);

beforeEach(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-mcp-usage-"));
  setTraceStorePathForTests(path.join(dir, "traces.json"));
  appendTrace(trace("eng-1", "engineering", { cost: 0.02 }));
  appendTrace(trace("eng-2", "engineering", { cost: 0.03, sample: true }));
  appendTrace(trace("sales-1", "sales", { model: "xai-grok", cost: 0.5 }));
  appendTrace(trace("untagged-1", undefined, { cost: 1 }));
});

afterEach(async () => {
  await Promise.all(clients.splice(0).map((c) => c.close()));
});

describe("MCP usage_by_model", () => {
  it("admin gets totals across every workspace", async () => {
    const summary = await usage(await connect({ role: "admin" }));
    expect(summary.totalRequests).toBe(4);
    expect(summary.totalCost).toBeCloseTo(1.55, 6);
    expect(summary.byModel.map((m) => [m.model, m.requests])).toEqual([
      ["bedrock-claude-sonnet-sim", 3],
      ["xai-grok", 1],
    ]);
  });

  it("non-admin gets only their own workspace's usage", async () => {
    const client = await connect({ role: "engineer", workspaceId: "engineering" });
    const eng = await usage(client);
    expect(eng.totalRequests).toBe(2);
    expect(eng.totalCost).toBeCloseTo(0.05, 6);
    expect(eng.byModel.map((m) => m.model)).toEqual(["bedrock-claude-sonnet-sim"]);

    expect((await usage(client, { source: "sample" })).totalRequests).toBe(1);
  });

  it("denies cross-workspace reads", async () => {
    const client = await connect({ role: "sales", workspaceId: "engineering" });
    expect(await usage(client)).toEqual({ source: "all", ...EMPTY });
  });

  it("returns empty usage when the operator caller is missing or unknown", async () => {
    for (const caller of [
      {},
      { workspaceId: "engineering" },
      { role: "engineer" as const },
      { role: "engineer" as const, workspaceId: "nope" },
      traceCallerFromEnv({ MCP_ROLE: "superuser", MCP_WORKSPACE_ID: "engineering" }),
    ]) {
      const client = await connect(caller);
      expect(await usage(client, { source: "live" })).toEqual({ source: "live", ...EMPTY });
    }
  });

  it("ignores role and workspaceId supplied as tool arguments", async () => {
    const client = await connect({ role: "engineer", workspaceId: "engineering" });
    const summary = await usage(client, { role: "admin", workspaceId: "sales" });
    expect(summary.totalRequests).toBe(2);

    const unscoped = await connect({});
    expect(await usage(unscoped, { role: "admin" })).toEqual({ source: "all", ...EMPTY });
  });

  it("does not advertise caller arguments", async () => {
    const { tools } = await (await connect({})).listTools();
    for (const name of ["usage_by_model", "list_traces"]) {
      const props = Object.keys(tools.find((t) => t.name === name)?.inputSchema.properties ?? {});
      expect(props).not.toContain("role");
      expect(props).not.toContain("workspaceId");
    }
  });
});

describe("MCP list_traces", () => {
  it("is scoped to the operator caller and ignores tool-supplied roles", async () => {
    const eng = await connect({ role: "engineer", workspaceId: "engineering" });
    expect(await traceIds(eng)).toEqual(["eng-2", "eng-1"]);
    expect(await traceIds(eng, { role: "admin" })).toEqual(["eng-2", "eng-1"]);

    expect(await traceIds(await connect({ role: "admin" }))).toHaveLength(4);
    expect(await traceIds(await connect({}), { role: "admin" })).toEqual([]);
  });
});
