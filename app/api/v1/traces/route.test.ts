import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { GatewayTrace, TraceListResult } from "@/lib/gateway/contracts";
import { appendTrace, setTraceStorePathForTests } from "@/lib/gateway/trace-store";
import { GET } from "./route";
import { POST as seedSample } from "./sample/route";

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

async function list(query: string): Promise<TraceListResult> {
  const res = await GET(new Request(`http://localhost/api/v1/traces${query}`));
  expect(res.status).toBe(200);
  return (await res.json()) as TraceListResult;
}

const ids = (r: TraceListResult) => r.data.map((t) => t.id);

describe("GET /api/v1/traces", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-route-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
    appendTrace(trace("eng-1", "engineering"));
    appendTrace(trace("sales-1", "sales"));
    appendTrace(trace("eng-2", "engineering"));
    appendTrace(trace("untagged-1"));
  });

  it("non-admin gets only their own workspace's traces", async () => {
    const result = await list("?role=engineer&workspaceId=engineering");
    expect(ids(result)).toEqual(["eng-2", "eng-1"]);
    expect(result.paging).toEqual({ nextCursor: null, limit: 25 });
  });

  it("paginates within the caller's workspace", async () => {
    const page1 = await list("?role=engineer&workspaceId=engineering&limit=1");
    expect(ids(page1)).toEqual(["eng-2"]);
    const page2 = await list(
      `?role=engineer&workspaceId=engineering&limit=1&cursor=${page1.paging.nextCursor}`,
    );
    expect(ids(page2)).toEqual(["eng-1"]);
    expect(page2.paging.nextCursor).toBeNull();
  });

  it("admin gets traces from every workspace", async () => {
    expect(ids(await list("?role=admin"))).toEqual([
      "untagged-1",
      "eng-2",
      "sales-1",
      "eng-1",
    ]);
  });

  it("returns an empty list when role or workspaceId is missing or invalid", async () => {
    expect((await list("")).data).toEqual([]);
    expect((await list("?workspaceId=engineering")).data).toEqual([]);
    expect((await list("?role=engineer")).data).toEqual([]);
    expect((await list("?role=superuser&workspaceId=engineering")).data).toEqual([]);
    expect((await list("?role=engineer&workspaceId=nope")).data).toEqual([]);
  });

  it("denies cross-workspace reads", async () => {
    expect((await list("?role=sales&workspaceId=engineering")).data).toEqual([]);
    expect((await list("?role=engineer&workspaceId=sales")).data).toEqual([]);
  });

  it("still returns a problem-details 400 for an out-of-range limit", async () => {
    const res = await GET(new Request("http://localhost/api/v1/traces?role=admin&limit=0"));
    expect(res.status).toBe(400);
    expect(res.headers.get("Content-Type")).toBe("application/problem+json");
    expect(await res.json()).toMatchObject({
      type: "https://api.example.com/problems/validation-error",
      status: 400,
      detail: "limit must be between 1 and 100",
      instance: "/api/v1/traces",
      traceId: expect.any(String),
    });
  });

  it("POST /api/v1/traces/sample still seeds history visible to admins", async () => {
    const seeded = (await (await seedSample()).json()) as { inserted: number };
    expect(seeded.inserted).toBeGreaterThan(0);
    const all = await list("?role=admin&limit=100");
    expect(all.data.some((t) => t.sample)).toBe(true);
  });
});
