import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { executePrompt } from "./execute";
import { listTraces, setTraceStorePathForTests } from "./trace-store";

describe("executePrompt", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-traces-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
  });

  it("writes one success trace with full input and output", async () => {
    const res = await executePrompt({
      input: "How do I fail over the market data gateway?",
      model: "bedrock-claude-sonnet-sim",
      caller: "test",
      workspaceId: "engineering",
    });

    expect(res.status).toBe("success");
    expect(res.output.length).toBeGreaterThan(20);
    expect(res.simulated).toBe(true);
    expect(res.cost).not.toBeNull();
    expect(res.totalTokens).toBe(res.inputTokens + res.outputTokens);

    const { data } = listTraces({ limit: 10 });
    expect(data).toHaveLength(1);
    expect(data[0].input).toContain("fail over");
    expect(data[0].output).toBe(res.output);
    expect(data[0].correlationId).toBe(res.correlationId);
  });

  it("writes one failure trace for forced errors", async () => {
    const res = await executePrompt({
      input: "__force_error__",
      model: "bedrock-claude-sonnet-sim",
      caller: "test",
    });

    expect(res.status).toBe("error");
    expect(res.output).toBe("");
    expect(res.error?.detail).toMatch(/Simulated model failure/);

    const { data } = listTraces({ limit: 10 });
    expect(data).toHaveLength(1);
    expect(data[0].status).toBe("error");
    expect(data[0].input).toBe("__force_error__");
  });

  it("records assembled output for streamed requests", async () => {
    const res = await executePrompt({
      input: "What are the key features of Market Data Feed X?",
      model: "bedrock-claude-sonnet-sim",
      caller: "test",
      workspaceId: "sales",
      stream: true,
    });

    expect(res.status).toBe("success");
    expect(res.output).toMatch(/Feed X/i);

    const { data } = listTraces({ limit: 5 });
    expect(data[0].output).toBe(res.output);
    expect(data[0].totalTokens).toBeGreaterThan(0);
  });

  it("returns cost null with reason for unknown models", async () => {
    const res = await executePrompt({
      input: "hello",
      model: "unknown-model-xyz",
      caller: "test",
      workspaceId: "engineering",
    });

    expect(res.status).toBe("success");
    expect(res.cost).toBeNull();
    expect(res.costUnavailableReason).toMatch(/No price entry/);
  });

  it("lists traces with cursor pagination", async () => {
    for (let i = 0; i < 3; i++) {
      await executePrompt({
        input: `ping ${i}`,
        model: "bedrock-claude-haiku-sim",
        caller: "pager",
        workspaceId: "support",
      });
    }

    const page1 = listTraces({ limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.paging.nextCursor).toBeTruthy();

    const page2 = listTraces({
      cursor: page1.paging.nextCursor!,
      limit: 2,
    });
    expect(page2.data.length).toBeGreaterThanOrEqual(1);
    expect(page2.data[0].id).not.toBe(page1.data[0].id);
  });

  it("honors idempotency keys", async () => {
    const req = {
      input: "SLA reconnect",
      model: "bedrock-claude-haiku-sim" as const,
      caller: "test",
      workspaceId: "support",
      idempotencyKey: "idem-abc",
    };
    const a = await executePrompt(req);
    const b = await executePrompt(req);
    expect(a.correlationId).toBe(b.correlationId);
    expect(listTraces({ limit: 10 }).data).toHaveLength(1);
  });

  it("runs workflows through the gateway", async () => {
    const res = await executePrompt({
      input: "[input:mode] explain\n[input:code] function x() {}",
      model: "bedrock-claude-sonnet-sim",
      caller: "engineer",
      workspaceId: "engineering",
      workflowId: "eng-code-assist",
    });
    expect(res.status).toBe("success");
    expect(res.output).toMatch(/Scripted/i);
  });
});
