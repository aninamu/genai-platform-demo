import { notFound } from "next/navigation";
import { WorkspacePageClient } from "@/components/WorkspacePageClient";
import { getSeedDocuments, getWorkflows, getWorkspace } from "@/lib/seed";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const workspace = getWorkspace(workspaceId);
  if (!workspace) notFound();

  const seedDocs = getSeedDocuments(workspace.id);
  const workflows = getWorkflows().filter((w) => w.workspaceId === workspace.id);

  return (
    <WorkspacePageClient
      workspace={workspace}
      seedDocs={seedDocs}
      workflows={workflows}
    />
  );
}
