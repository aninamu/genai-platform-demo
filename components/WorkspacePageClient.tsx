"use client";

import { WorkspaceAuthGate } from "@/components/WorkspaceAuthGate";
import { WorkspaceView } from "@/components/WorkspaceView";
import type {
  SeedDocument,
  WorkflowDefinition,
  Workspace,
} from "@/lib/types";

export function WorkspacePageClient({
  workspace,
  seedDocs,
  workflows,
}: {
  workspace: Workspace;
  seedDocs: SeedDocument[];
  workflows: WorkflowDefinition[];
}) {
  return (
    <WorkspaceAuthGate workspace={workspace} fallbackRedirect="/">
      {(role) => (
        <WorkspaceView
          workspace={workspace}
          seedDocs={seedDocs}
          workflows={workflows}
          caller={role}
        />
      )}
    </WorkspaceAuthGate>
  );
}
