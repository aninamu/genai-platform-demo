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

export interface RetrievalHit {
  documentId: string;
  title: string;
  snippet: string;
  score: number;
}
