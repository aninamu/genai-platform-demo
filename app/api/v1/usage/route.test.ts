import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { GatewayTrace, UsageSummary } from "@/lib/gateway/contracts";
import { appendTrace, setTraceStorePathForTests } from "@/lib/gateway/trace-store";
import { GET } from "./route";

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

async function usage(query: string): Promise<UsageSummary> {
  const res = await GET(new Request(`http://localhost/api/v1/usage${query}`));
  expect(res.status).toBe(200);
  return (await res.json()) as UsageSummary;
}

describe("GET /api/v1/usage", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-usage-route-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
    appendTrace(trace("eng-1", "engineering", { cost: 0.02 }));
    appendTrace(trace("eng-2", "engineering", { cost: 0.03, sample: true }));
    appendTrace(trace("sales-1", "sales", { model: "xai-grok", cost: 0.5 }));
    appendTrace(trace("untagged-1", undefined, { cost: 1 }));
  });

  it("admin gets totals across every workspace", async () => {
    const summary = await usage("?role=admin");
    expect(summary.totalRequests).toBe(4);
    expect(summary.totalCost).toBeCloseTo(1.55, 6);
    expect(summary.sampleRequests).toBe(1);
    expect(summary.byModel.map((m) => [m.model, m.requests])).toEqual([
      ["bedrock-claude-sonnet-sim", 3],
      ["xai-grok", 1],
    ]);
  });

  it("non-admin gets only their own workspace's usage", async () => {
    const summary = await usage("?role=engineer&workspaceId=engineering");
    expect(summary.totalRequests).toBe(2);
    expect(summary.totalCost).toBeCloseTo(0.05, 6);
    expect(summary.byModel).toEqual([
      expect.objectContaining({ model: "bedrock-claude-sonnet-sim", requests: 2, share: 1 }),
    ]);

    const sales = await usage("?role=sales&workspaceId=sales");
    expect(sales.totalRequests).toBe(1);
    expect(sales.byModel[0].model).toBe("xai-grok");
  });

  it("applies the source filter within the caller's scope", async () => {
    const sample = await usage("?role=engineer&workspaceId=engineering&source=sample");
    expect(sample.source).toBe("sample");
    expect(sample.totalRequests).toBe(1);
    expect(sample.totalCost).toBeCloseTo(0.03, 6);
  });

  it("denies cross-workspace reads", async () => {
    expect((await usage("?role=sales&workspaceId=engineering")).totalRequests).toBe(0);
    expect((await usage("?role=engineer&workspaceId=sales")).totalRequests).toBe(0);
  });

  it("returns empty usage when role or workspaceId is missing or invalid", async () => {
    for (const query of [
      "",
      "?source=all",
      "?workspaceId=engineering",
      "?role=engineer",
      "?role=superuser&workspaceId=engineering",
      "?role=engineer&workspaceId=nope",
    ]) {
      expect(await usage(query)).toEqual({
        source: "all",
        totalRequests: 0,
        totalCost: 0,
        sampleRequests: 0,
        byModel: [],
      });
    }
  });

  it("still returns a problem-details 400 for an invalid source", async () => {
    const res = await GET(new Request("http://localhost/api/v1/usage?role=admin&source=bogus"));
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    expect(await res.json()).toMatchObject({
      type: "https://api.example.com/problems/validation-error",
      status: 400,
      detail: "source must be one of all, live, sample",
      instance: "/api/v1/usage",
      traceId: expect.any(String),
    });
  });
});
