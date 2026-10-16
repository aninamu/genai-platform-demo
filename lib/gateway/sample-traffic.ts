import {
  DEFAULT_XAI_MODEL,
  GROK_MODEL_ID,
  SAMPLE_TRAFFIC_DEFAULT_MODEL_ID,
} from "@/lib/models";
import type { GatewayTrace } from "./contracts";
import { calculateCost } from "./pricing";
import { replaceSampleTraces } from "./trace-store";

export const SAMPLE_TRACE_COUNT = 500;

/** Request counts per model. Opus dominates sample history; Grok is 18/500 = 3.6%. */
const MIX: {
  model: string;
  requests: number;
  latencyMs: [number, number];
  outputTokens: [number, number];
}[] = [
  {
    model: SAMPLE_TRAFFIC_DEFAULT_MODEL_ID,
    requests: 350,
    latencyMs: [2800, 5800],
    outputTokens: [300, 900],
  },
  { model: "bedrock-claude-sonnet-sim", requests: 90, latencyMs: [1500, 3200], outputTokens: [250, 800] },
  { model: "bedrock-claude-haiku-sim", requests: 42, latencyMs: [500, 1200], outputTokens: [150, 500] },
  { model: GROK_MODEL_ID, requests: 18, latencyMs: [1200, 2700], outputTokens: [250, 800] },
];

const WORKSPACES = ["engineering", "sales", "support", "data-ops"];
const CALLERS = ["engineer", "sales", "support", "data-ops", "admin"];

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic synthetic history spread over the 30 days before `now`. */
export function buildSampleTraces(now = new Date()): GatewayTrace[] {
  const rand = mulberry32(20261015);
  const between = ([lo, hi]: [number, number]) =>
    Math.round(lo + rand() * (hi - lo));
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];

  const models = MIX.flatMap((m) => Array.from({ length: m.requests }, () => m));
  for (let i = models.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [models[i], models[j]] = [models[j], models[i]];
  }

  const windowMs = 30 * 24 * 60 * 60 * 1000;
  return models.map((mix, i) => {
    const workspaceId = pick(WORKSPACES);
    const inputTokens = between([600, 2800]);
    const outputTokens = between(mix.outputTokens);
    const providerModel = mix.model === GROK_MODEL_ID ? DEFAULT_XAI_MODEL : undefined;
    const pricing = calculateCost(providerModel ?? mix.model, inputTokens, outputTokens);
    const id = `sample-${String(i).padStart(4, "0")}`;
    return {
      id,
      correlationId: id,
      createdAt: new Date(now.getTime() - rand() * windowMs).toISOString(),
      caller: pick(CALLERS),
      workspaceId,
      model: mix.model,
      ...(providerModel ? { providerModel } : {}),
      input: `[sample history] Synthetic ${workspaceId} request #${i}`,
      output: "[sample history] No model was called; usage values are synthetic.",
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: pricing.cost,
      costUnavailableReason: pricing.costUnavailableReason,
      currency: pricing.currency,
      latencyMs: between(mix.latencyMs),
      status: "success",
      simulated: true,
      sample: true,
    } satisfies GatewayTrace;
  });
}

export function seedSampleTraffic(now = new Date()): { inserted: number } {
  const samples = buildSampleTraces(now);
  replaceSampleTraces(samples);
  return { inserted: samples.length };
}
