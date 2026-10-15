import type {
  GatewayRequest,
  GatewayResponse,
  ProblemDetails,
  TraceListResult,
} from "./contracts";

export class GatewayClientError extends Error {
  readonly problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = "GatewayClientError";
    this.problem = problem;
  }
}

export interface GatewayClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") return "";
  return process.env.GATEWAY_BASE_URL ?? "http://127.0.0.1:3000";
}

const REQUEST_TIMEOUT_MS = 30_000;

export function createGatewayClient(options: GatewayClientOptions = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async complete(request: GatewayRequest): Promise<GatewayResponse> {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (request.idempotencyKey) {
        headers["Idempotency-Key"] = request.idempotencyKey;
      }

      const res = await fetchImpl(`${baseUrl}/api/v1/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!res.ok) {
        const problem = (await res.json()) as ProblemDetails;
        throw new GatewayClientError(problem);
      }

      return (await res.json()) as GatewayResponse;
    },

    async listTraces(params?: {
      cursor?: string;
      limit?: number;
    }): Promise<TraceListResult> {
      const qs = new URLSearchParams();
      if (params?.cursor) qs.set("cursor", params.cursor);
      if (params?.limit) qs.set("limit", String(params.limit));
      const suffix = qs.toString() ? `?${qs}` : "";

      const res = await fetchImpl(`${baseUrl}/api/v1/traces${suffix}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        const problem = (await res.json()) as ProblemDetails;
        throw new GatewayClientError(problem);
      }
      return (await res.json()) as TraceListResult;
    },
  };
}

export type GatewayClient = ReturnType<typeof createGatewayClient>;
