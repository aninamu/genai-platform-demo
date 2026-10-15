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
  simulated: true;
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
  simulated: true;
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
