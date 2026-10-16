export type GatewayStatus = "success" | "error";

export interface GatewayDocumentContext {
  id: string;
  name: string;
  content: string;
}

export interface GatewayRequest {
  input: string;
  model: string;
  caller: string;
  workspaceId?: string;
  workflowId?: string;
  /** BDK agent step id from data/mock/agent-runs.json */
  agentStepId?: string;
  correlationId?: string;
  stream?: boolean;
  documents?: GatewayDocumentContext[];
  idempotencyKey?: string;
}

export interface GatewayUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GatewayCitation {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}

export interface GatewayResponse {
  output: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
  costUnavailableReason?: string;
  currency: string;
  latencyMs: number;
  status: GatewayStatus;
  correlationId: string;
  /** False only for real provider calls (Grok via xAI). */
  simulated: boolean;
  /** Upstream model id when it differs from the gateway model id, e.g. "grok-4.7". */
  providerModel?: string;
  citations?: GatewayCitation[];
  error?: {
    type: string;
    title: string;
    detail: string;
  };
}

export interface GatewayTrace {
  id: string;
  correlationId: string;
  createdAt: string;
  caller: string;
  workspaceId?: string;
  workflowId?: string;
  agentStepId?: string;
  model: string;
  input: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
  costUnavailableReason?: string;
  currency: string;
  latencyMs: number;
  status: GatewayStatus;
  simulated: boolean;
  providerModel?: string;
  /** Seeded sample history, not produced by a real or scripted request. */
  sample?: boolean;
  citations?: GatewayCitation[];
  error?: GatewayResponse["error"];
}

export interface TraceListResult {
  data: GatewayTrace[];
  paging: {
    nextCursor: string | null;
    limit: number;
  };
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  traceId: string;
}

export interface ModelUsage {
  model: string;
  requests: number;
  /** Fraction of all requests in the selection, 0–1. */
  share: number;
  errors: number;
  totalTokens: number;
  totalCost: number;
  avgCostPerRequest: number | null;
  /** Requests whose cost was null (unknown pricing or failed before usage). */
  unpricedRequests: number;
  avgLatencyMs: number;
}

export type UsageSource = "all" | "live" | "sample";

export interface UsageSummary {
  source: UsageSource;
  totalRequests: number;
  totalCost: number;
  sampleRequests: number;
  byModel: ModelUsage[];
}
