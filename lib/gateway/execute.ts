import { randomUUID } from "node:crypto";
import type {
  GatewayRequest,
  GatewayResponse,
  GatewayTrace,
} from "./contracts";
import { DEFAULT_XAI_MODEL, GROK_MODEL_ID } from "@/lib/models";
import { runMockModel, streamMockModel } from "./mock-model";
import { calculateCost } from "./pricing";
import { appendTrace, findTraceByIdempotencyKey } from "./trace-store";
import {
  getXaiConfig,
  ProviderNotConfiguredError,
  runXaiModel,
} from "./xai-model";

export const PROVIDER_NOT_CONFIGURED_TYPE =
  "https://api.example.com/problems/provider-not-configured";

function buildTrace(
  request: GatewayRequest,
  response: GatewayResponse,
  idempotencyKey?: string,
): GatewayTrace {
  return {
    id: idempotencyKey ? `idem-${idempotencyKey}` : randomUUID(),
    correlationId: response.correlationId,
    createdAt: new Date().toISOString(),
    caller: request.caller,
    workspaceId: request.workspaceId,
    workflowId: request.workflowId,
    agentStepId: request.agentStepId,
    model: response.model,
    input: request.input,
    output: response.output,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    totalTokens: response.totalTokens,
    cost: response.cost,
    costUnavailableReason: response.costUnavailableReason,
    currency: response.currency,
    latencyMs: response.latencyMs,
    status: response.status,
    simulated: response.simulated,
    ...(response.providerModel ? { providerModel: response.providerModel } : {}),
    citations: response.citations,
    error: response.error,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  } as GatewayTrace;
}

function findIdempotent(key: string): GatewayResponse | null {
  const hit = findTraceByIdempotencyKey(key);
  if (!hit) return null;
  return {
    output: hit.output,
    model: hit.model,
    inputTokens: hit.inputTokens,
    outputTokens: hit.outputTokens,
    totalTokens: hit.totalTokens,
    cost: hit.cost,
    costUnavailableReason: hit.costUnavailableReason,
    currency: hit.currency,
    latencyMs: hit.latencyMs,
    status: hit.status,
    correlationId: hit.correlationId,
    simulated: hit.simulated,
    providerModel: hit.providerModel,
    citations: hit.citations,
    error: hit.error,
  };
}

export async function executePrompt(
  request: GatewayRequest,
): Promise<GatewayResponse> {
  const started = Date.now();
  const correlationId = request.correlationId ?? randomUUID();
  const wantsLive = request.model === GROK_MODEL_ID;

  if (request.idempotencyKey) {
    const cached = findIdempotent(request.idempotencyKey);
    if (cached) return cached;
  }

  try {
    let output: string;
    let inputTokens: number;
    let outputTokens: number;
    let citations: GatewayResponse["citations"];
    let cachedInputTokens = 0;
    let providerModel: string | undefined;
    let simulated = !wantsLive;

    if (wantsLive) {
      try {
        // Upstream call is not streamed; the gateway returns the assembled output either way.
        const result = await runXaiModel(request);
        output = result.output;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
        cachedInputTokens = result.cachedInputTokens;
        providerModel = result.providerModel;
        citations = [];
        simulated = false;
      } catch (err) {
        // Agent desk demos stay deterministic without XAI_API_KEY: fall back to
        // the scripted Grok-shaped packet (includes X context when authored).
        if (
          err instanceof ProviderNotConfiguredError &&
          request.agentStepId
        ) {
          const result = await runMockModel(request);
          output = result.output;
          inputTokens = result.inputTokens;
          outputTokens = result.outputTokens;
          citations = result.citations;
          // Price against the configured xAI model id so traces still show cost.
          providerModel = getXaiConfig().model || DEFAULT_XAI_MODEL;
          simulated = true;
        } else {
          throw err;
        }
      }
    } else if (request.stream) {
      const generator = streamMockModel(request);
      let assembled = "";
      let final = await generator.next();
      while (!final.done) {
        assembled += final.value;
        final = await generator.next();
      }
      const result = final.value;
      output = result.output || assembled;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      citations = result.citations;
    } else {
      const result = await runMockModel(request);
      output = result.output;
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      citations = result.citations;
    }

    const pricing = calculateCost(
      providerModel ?? request.model,
      inputTokens,
      outputTokens,
      { cachedInputTokens },
    );
    const response: GatewayResponse = {
      output,
      model: request.model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost: pricing.cost,
      costUnavailableReason: pricing.costUnavailableReason,
      currency: pricing.currency,
      latencyMs: Date.now() - started,
      status: "success",
      correlationId,
      simulated,
      ...(providerModel ? { providerModel } : {}),
      citations,
    };

    appendTrace(buildTrace(request, response, request.idempotencyKey));
    return response;
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    const response: GatewayResponse = {
      output: "",
      model: request.model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cost: null,
      costUnavailableReason: "Request failed before usage was recorded",
      currency: "USD",
      latencyMs: Date.now() - started,
      status: "error",
      correlationId,
      simulated: !wantsLive,
      error:
        err instanceof ProviderNotConfiguredError
          ? {
              type: PROVIDER_NOT_CONFIGURED_TYPE,
              title: "Model Unavailable",
              detail,
            }
          : {
              type: "https://api.example.com/problems/gateway-error",
              title: "Gateway Error",
              detail,
            },
    };
    appendTrace(buildTrace(request, response, request.idempotencyKey));
    return response;
  }
}
