import fs from "node:fs";
import path from "node:path";
import type {
  ScriptedResponse,
  SeedDocument,
  WorkflowDefinition,
  Workspace,
  WorkspaceId,
} from "./types";

const ROOT = path.join(process.cwd(), "data", "mock");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")) as T;
}

export function getWorkspaces(): Workspace[] {
  return readJson<Workspace[]>("workspaces.json");
}

export function getWorkspace(id: string): Workspace | undefined {
  return getWorkspaces().find((w) => w.id === id);
}

export function getScriptedResponses(): ScriptedResponse[] {
  return readJson<ScriptedResponse[]>("responses.json");
}

export function getWorkflows(): WorkflowDefinition[] {
  return readJson<WorkflowDefinition[]>("workflows.json");
}

export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return getWorkflows().find((w) => w.id === id);
}

const DOC_WORKSPACE: Record<string, WorkspaceId | "shared"> = {
  "eng-runbook": "engineering",
  "eng-api-guide": "engineering",
  "sales-product-sheet": "sales",
  "sales-account-notes": "sales",
  "sales-release-notes": "sales",
  "support-playbook": "support",
  "dataops-sop": "data-ops",
};

export function getSeedDocuments(workspaceId?: string): SeedDocument[] {
  const dir = path.join(ROOT, "documents");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));

  return files
    .map((file) => {
      const id = file.replace(/\.md$/, "");
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      const titleMatch = content.match(/^#\s+(.+)$/m);
      return {
        id,
        title: titleMatch?.[1] ?? id,
        workspaceId: DOC_WORKSPACE[id] ?? "shared",
        content,
      } satisfies SeedDocument;
    })
    .filter((doc) =>
      workspaceId
        ? doc.workspaceId === workspaceId || doc.workspaceId === "shared"
        : true,
    );
}

export function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "");
}
