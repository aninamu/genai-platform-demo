import { randomUUID } from "node:crypto";
import type {
  GatewayRequest,
  GatewayResponse,
  GatewayTrace,
} from "./contracts";
import { runMockModel, streamMockModel } from "./mock-model";
import { calculateCost } from "./pricing";
import { appendTrace, findTraceByIdempotencyKey } from "./trace-store";

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
    simulated: true,
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
    simulated: true,
    citations: hit.citations,
    error: hit.error,
  };
}

export async function executePrompt(
  request: GatewayRequest,
): Promise<GatewayResponse> {
  const started = Date.now();
  const correlationId = request.correlationId ?? randomUUID();

  if (request.idempotencyKey) {
    const cached = findIdempotent(request.idempotencyKey);
    if (cached) return cached;
  }

  try {
    let output: string;
    let inputTokens: number;
    let outputTokens: number;
    let citations: GatewayResponse["citations"];

    if (request.stream) {
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

    const pricing = calculateCost(request.model, inputTokens, outputTokens);
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
      simulated: true,
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
      simulated: true,
      error: {
        type: "https://api.example.com/problems/gateway-error",
        title: "Gateway Error",
        detail,
      },
    };
    appendTrace(buildTrace(request, response, request.idempotencyKey));
    return response;
  }
}
