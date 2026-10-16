export type Role =
  | "engineer"
  | "sales"
  | "support"
  | "data-ops"
  | "admin";

export type WorkspaceId =
  | "engineering"
  | "sales"
  | "support"
  | "data-ops";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  description: string;
  allowedRoles: Role[];
  model: string;
  suggestedPrompts: string[];
}

export interface SeedDocument {
  id: string;
  title: string;
  workspaceId: WorkspaceId | "shared";
  content: string;
}

export interface ScriptedResponse {
  id: string;
  workspaceId: WorkspaceId;
  keywords: string[];
  citationIds: string[];
  answer: string;
}

export interface WorkflowSource {
  label: string;
  url: string;
}

export interface WorkflowInput {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  defaultValue?: string;
}

export interface WorkflowDefinition {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  description: string;
  source: WorkflowSource;
  inputs: WorkflowInput[];
  promptTemplate: string;
  output: string;
}

export interface UploadedDocument {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  content: string;
  uploadedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  correlationId?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number | null;
  simulated?: boolean;
}

export interface AgentStepDefinition {
  id: string;
  label: string;
  input: string;
  output: string;
  /** Grok-path scripted output that includes X context. */
  outputWithX?: string;
  citationIds: string[];
  approvalGate?: boolean;
  requiresPriorApproval?: boolean;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  caller: string;
  workspaceId: WorkspaceId;
  skillPath: string;
  defaultModel: string;
  supportsMobile: boolean;
  steps: AgentStepDefinition[];
}

export interface AgentMobileSession {
  agentId: string;
  agentName: string;
  stepId: string;
  model: string;
  output: string;
  correlationId?: string;
  cost?: number | null;
  simulated?: boolean;
  citations?: { documentId: string; title: string; snippet: string }[];
  updatedAt: string;
}

export interface RetrievalHit {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}
