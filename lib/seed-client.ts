/**
 * Client-safe seed helpers (no fs). Server code should use lib/seed.ts.
 */
import workspaces from "@/data/mock/workspaces.json";
import responses from "@/data/mock/responses.json";
import workflows from "@/data/mock/workflows.json";
import type {
  ScriptedResponse,
  WorkflowDefinition,
  Workspace,
  WorkspaceId,
} from "./types";

export function getWorkspacesClient(): Workspace[] {
  return workspaces as Workspace[];
}

export function getWorkspaceClient(id: string): Workspace | undefined {
  return getWorkspacesClient().find((w) => w.id === id);
}

export function getWorkflowsClient(workspaceId?: WorkspaceId): WorkflowDefinition[] {
  const all = workflows as WorkflowDefinition[];
  return workspaceId ? all.filter((w) => w.workspaceId === workspaceId) : all;
}

export function getResponsesClient(): ScriptedResponse[] {
  return responses as ScriptedResponse[];
}

export function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}

/** Static document metadata for the UI library (content loaded from API/seed on server). */
export const DOCUMENT_INDEX: {
  id: string;
  title: string;
  workspaceId: WorkspaceId;
}[] = [
  {
    id: "eng-runbook",
    title: "Synthetic sample document — Market Data Gateway Runbook",
    workspaceId: "engineering",
  },
  {
    id: "eng-api-guide",
    title: "Synthetic sample document — API Style Guide",
    workspaceId: "engineering",
  },
  {
    id: "sales-product-sheet",
    title: "Synthetic sample document — Market Data Feed X Product Sheet",
    workspaceId: "sales",
  },
  {
    id: "sales-account-notes",
    title: "Synthetic sample document — Northwind Capital Account Notes",
    workspaceId: "sales",
  },
  {
    id: "sales-release-notes",
    title: "Synthetic sample document — Feed X Release Notes 2026.09",
    workspaceId: "sales",
  },
  {
    id: "support-playbook",
    title: "Synthetic sample document — Client Support Escalation Playbook",
    workspaceId: "support",
  },
  {
    id: "dataops-sop",
    title: "Synthetic sample document — Reference Data Reconciliation SOP",
    workspaceId: "data-ops",
  },
];
