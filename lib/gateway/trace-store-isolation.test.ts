import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { GatewayTrace } from "./contracts";
import { appendTrace, listAllTraces, resetTraceStoreForTests } from "./trace-store";

const REAL_STORE = path.join(process.cwd(), ".data", "traces.json");

function fingerprint(): string {
  if (!fs.existsSync(REAL_STORE)) return "absent";
  const { mtimeMs } = fs.statSync(REAL_STORE);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(REAL_STORE)).digest("hex");
  return `${hash}:${mtimeMs}`;
}

const canary: GatewayTrace = {
  id: "isolation-canary",
  correlationId: "corr-isolation-canary",
  createdAt: "2026-10-16T00:00:00.000Z",
  caller: "test",
  model: "bedrock-claude-sonnet-sim",
  input: "[synthetic] isolation canary",
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

describe("trace store test isolation", () => {
  it("the default test store is a temp file, not the repo's .data/traces.json", () => {
    const before = fingerprint();

    expect(listAllTraces()).toEqual([]);
    appendTrace(canary);
    expect(listAllTraces().map((t) => t.id)).toEqual(["isolation-canary"]);
    resetTraceStoreForTests();
    expect(listAllTraces()).toEqual([]);

    expect(fingerprint()).toBe(before);
  });

  it("starts each test with an empty temp store", () => {
    expect(listAllTraces()).toEqual([]);
  });
});
