import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { GatewayTrace } from "./contracts";
import { getWorkspace } from "@/lib/seed";
import {
  getUsageSummaryForCaller,
  listTracesForCaller,
  traceCallerFromEnv,
} from "./trace-access";
import { appendTrace, setTraceStorePathForTests } from "./trace-store";

function trace(id: string, workspaceId?: string): GatewayTrace {
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
    cost: 0,
    currency: "USD",
    latencyMs: 1,
    status: "success",
    simulated: true,
  };
}

const ids = (r: { data: GatewayTrace[] }) => r.data.map((t) => t.id);

describe("listTracesForCaller", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-access-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
    appendTrace(trace("eng-1", "engineering"));
    appendTrace(trace("sales-1", "sales"));
    appendTrace(trace("eng-2", "engineering"));
    appendTrace(trace("support-1", "support"));
    appendTrace(trace("untagged-1"));
  });

  it("non-admin sees only traces from their own workspace", () => {
    const result = listTracesForCaller({ role: "engineer", workspaceId: "engineering" });
    expect(ids(result)).toEqual(["eng-2", "eng-1"]);
    expect(result.paging.nextCursor).toBeNull();

    expect(ids(listTracesForCaller({ role: "sales", workspaceId: "sales" }))).toEqual([
      "sales-1",
    ]);
  });

  it("paginates within the caller's workspace", () => {
    const page1 = listTracesForCaller(
      { role: "engineer", workspaceId: "engineering" },
      { limit: 1 },
    );
    expect(ids(page1)).toEqual(["eng-2"]);
    expect(page1.paging.nextCursor).toBe("eng-2");

    const page2 = listTracesForCaller(
      { role: "engineer", workspaceId: "engineering" },
      { limit: 1, cursor: page1.paging.nextCursor },
    );
    expect(ids(page2)).toEqual(["eng-1"]);
    expect(page2.paging.nextCursor).toBeNull();
  });

  it("ignores a cursor pointing at another workspace's trace", () => {
    const caller = { role: "engineer", workspaceId: "engineering" } as const;
    for (const cursor of ["sales-1", "support-1", "untagged-1"]) {
      const page = listTracesForCaller(caller, { cursor, limit: 1 });
      expect(ids(page)).toEqual(["eng-2"]);
      expect(page.paging.nextCursor).toBe("eng-2");
    }
    const full = listTracesForCaller(caller, { cursor: "sales-1" });
    expect(full.data.every((t) => t.workspaceId === "engineering")).toBe(true);
  });

  it("admin sees traces from every workspace, including untagged ones", () => {
    expect(ids(listTracesForCaller({ role: "admin" }))).toEqual([
      "untagged-1",
      "support-1",
      "eng-2",
      "sales-1",
      "eng-1",
    ]);
    expect(listTracesForCaller({ role: "admin", workspaceId: "sales" }).data).toHaveLength(5);
  });

  it("returns no traces when caller info is missing", () => {
    expect(listTracesForCaller({}).data).toEqual([]);
    expect(listTracesForCaller({ workspaceId: "engineering" }).data).toEqual([]);
    expect(listTracesForCaller({ role: "engineer" }).data).toEqual([]);
    expect(listTracesForCaller({}).paging.nextCursor).toBeNull();
  });

  it("returns no traces for a workspace the role cannot access or that does not exist", () => {
    expect(listTracesForCaller({ role: "engineer", workspaceId: "sales" }).data).toEqual([]);
    expect(listTracesForCaller({ role: "support", workspaceId: "unknown" }).data).toEqual([]);
  });
});

describe("getUsageSummaryForCaller", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-usage-access-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
    appendTrace(trace("eng-1", "engineering"));
    appendTrace(trace("sales-1", "sales"));
    appendTrace(trace("eng-2", "engineering"));
    appendTrace(trace("untagged-1"));
  });

  it("admin totals include every workspace and untagged traces", () => {
    expect(getUsageSummaryForCaller({ role: "admin" }).totalRequests).toBe(4);
  });

  it("non-admin totals cover only their own workspace", () => {
    expect(
      getUsageSummaryForCaller({ role: "engineer", workspaceId: "engineering" }).totalRequests,
    ).toBe(2);
    expect(getUsageSummaryForCaller({ role: "sales", workspaceId: "sales" }).totalRequests).toBe(1);
  });

  it("returns empty usage for missing, unknown, or cross-workspace callers", () => {
    for (const caller of [
      {},
      { workspaceId: "engineering" },
      { role: "engineer" as const },
      { role: "engineer" as const, workspaceId: "sales" },
      { role: "support" as const, workspaceId: "unknown" },
    ]) {
      const summary = getUsageSummaryForCaller(caller, "live");
      expect(summary).toEqual({
        source: "live",
        totalRequests: 0,
        totalCost: 0,
        sampleRequests: 0,
        byModel: [],
      });
    }
  });
});

describe("traceCallerFromEnv", () => {
  it("reads a known role and workspace", () => {
    expect(
      traceCallerFromEnv({ MCP_ROLE: "engineer", MCP_WORKSPACE_ID: "engineering" }),
    ).toEqual({ role: "engineer", workspaceId: "engineering" });
  });

  it("drops unset, empty, or unknown values so access fails closed", () => {
    expect(traceCallerFromEnv({})).toEqual({ role: undefined, workspaceId: undefined });
    expect(traceCallerFromEnv({ MCP_ROLE: "", MCP_WORKSPACE_ID: "" })).toEqual({
      role: undefined,
      workspaceId: undefined,
    });
    expect(traceCallerFromEnv({ MCP_ROLE: "superuser" }).role).toBeUndefined();
    expect(traceCallerFromEnv({ MCP_ROLE: "Admin" }).role).toBeUndefined();
  });

  it("the default .cursor/mcp.json launch resolves to a caller scoped to one workspace", () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), ".cursor", "mcp.json"), "utf8"),
    ) as { mcpServers: Record<string, { env?: Record<string, string> }> };
    const caller = traceCallerFromEnv(config.mcpServers["nasdaq-genai-gateway"].env ?? {});

    expect(caller.role).toBeDefined();
    expect(caller.role).not.toBe("admin");
    expect(caller.workspaceId).toBeDefined();
    expect(getWorkspace(caller.workspaceId!)?.allowedRoles).toContain(caller.role);
  });
});
