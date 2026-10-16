import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL_ID,
  GROK_MODEL_ID,
  SAMPLE_TRAFFIC_DEFAULT_MODEL_ID,
} from "@/lib/models";
import { executePrompt } from "./execute";
import { buildSampleTraces, SAMPLE_TRACE_COUNT, seedSampleTraffic } from "./sample-traffic";
import { listAllTraces, setTraceStorePathForTests } from "./trace-store";
import { getUsageSummary } from "./usage";

describe("usage by model", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-usage-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
  });

  it("sample history has Opus dominant and Grok at 3.6% of traffic", () => {
    seedSampleTraffic(new Date("2026-10-15T00:00:00Z"));
    const summary = getUsageSummary("sample");

    expect(summary.totalRequests).toBe(SAMPLE_TRACE_COUNT);
    expect(summary.sampleRequests).toBe(SAMPLE_TRACE_COUNT);
    expect(summary.byModel[0].model).toBe(SAMPLE_TRAFFIC_DEFAULT_MODEL_ID);
    expect(summary.byModel[0].share).toBeGreaterThan(0.5);

    const grok = summary.byModel.find((m) => m.model === GROK_MODEL_ID)!;
    expect(grok.share).toBeCloseTo(0.036, 5);
    expect(grok.avgCostPerRequest).not.toBeNull();
    expect(grok.avgCostPerRequest!).toBeLessThan(summary.byModel[0].avgCostPerRequest!);
    expect(summary.byModel.every((m) => m.avgLatencyMs > 0)).toBe(true);
  });

  it("sample traces are clearly labeled and deterministic", () => {
    const now = new Date("2026-10-15T00:00:00Z");
    const a = buildSampleTraces(now);
    expect(a).toEqual(buildSampleTraces(now));
    expect(a.every((t) => t.sample && t.simulated && t.input.startsWith("[sample history]"))).toBe(true);
  });

  it("separates live traffic from sample history and reseeds idempotently", async () => {
    await executePrompt({
      input: "How do I escalate a P1 connectivity outage?",
      model: DEFAULT_MODEL_ID,
      caller: "test",
      workspaceId: "support",
    });
    seedSampleTraffic();
    seedSampleTraffic();

    expect(listAllTraces()).toHaveLength(SAMPLE_TRACE_COUNT + 1);
    expect(listAllTraces()[0].sample).toBeUndefined();

    const live = getUsageSummary("live");
    expect(live.totalRequests).toBe(1);
    expect(live.byModel).toEqual([
      expect.objectContaining({ model: DEFAULT_MODEL_ID, requests: 1, share: 1 }),
    ]);
    expect(getUsageSummary("all").totalRequests).toBe(SAMPLE_TRACE_COUNT + 1);
  });
});
