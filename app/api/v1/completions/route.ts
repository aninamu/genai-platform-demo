import { executePrompt } from "@/lib/gateway";
import type { GatewayRequest } from "@/lib/gateway/contracts";
import { problemResponse } from "@/lib/api/problem";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const instance = "/api/v1/completions";

  let body: Partial<GatewayRequest>;
  try {
    body = (await request.json()) as Partial<GatewayRequest>;
  } catch {
    return problemResponse(
      400,
      "Validation Error",
      "Request body must be JSON",
      instance,
      "https://api.example.com/problems/validation-error",
    );
  }

  if (!body.input || typeof body.input !== "string") {
    return problemResponse(
      400,
      "Validation Error",
      "input is required",
      instance,
      "https://api.example.com/problems/validation-error",
    );
  }
  if (!body.model || typeof body.model !== "string") {
    return problemResponse(
      400,
      "Validation Error",
      "model is required",
      instance,
      "https://api.example.com/problems/validation-error",
    );
  }
  if (!body.caller || typeof body.caller !== "string") {
    return problemResponse(
      400,
      "Validation Error",
      "caller is required",
      instance,
      "https://api.example.com/problems/validation-error",
    );
  }

  const idempotencyKey =
    request.headers.get("Idempotency-Key") ?? body.idempotencyKey;

  const result = await executePrompt({
    input: body.input,
    model: body.model,
    caller: body.caller,
    workspaceId: body.workspaceId,
    workflowId: body.workflowId,
    correlationId: body.correlationId,
    stream: body.stream,
    documents: body.documents,
    idempotencyKey: idempotencyKey ?? undefined,
  });

  if (result.status === "error") {
    return problemResponse(
      500,
      result.error?.title ?? "Gateway Error",
      result.error?.detail ?? "Prompt execution failed",
      instance,
      result.error?.type ?? "https://api.example.com/problems/gateway-error",
    );
  }

  return Response.json(result);
}
