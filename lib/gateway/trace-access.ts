import { ALL_ROLES, canAccessWorkspace } from "@/lib/permissions";
import { getWorkspace } from "@/lib/seed";
import type { Role } from "@/lib/types";
import type { TraceListResult } from "./contracts";
import { listTraces } from "./trace-store";

export interface TraceCaller {
  role?: Role;
  workspaceId?: string;
}

/**
 * Caller for operator-launched surfaces (the MCP server), read from MCP_ROLE and
 * MCP_WORKSPACE_ID. Unknown roles are dropped, so they fail closed.
 */
export function traceCallerFromEnv(
  env: Record<string, string | undefined> = process.env,
): TraceCaller {
  return {
    role: ALL_ROLES.find((r) => r === env.MCP_ROLE),
    workspaceId: env.MCP_WORKSPACE_ID || undefined,
  };
}

/**
 * Admins see every trace. Everyone else sees only traces tagged with their own
 * workspace, and only if their role may access it. Missing caller info yields
 * no traces rather than falling back to the full list.
 */
export function listTracesForCaller(
  caller: TraceCaller,
  options?: { cursor?: string | null; limit?: number },
): TraceListResult {
  const { role, workspaceId } = caller;
  if (role === "admin") return listTraces(options);

  const workspace = workspaceId ? getWorkspace(workspaceId) : undefined;
  if (!role || !workspace || !canAccessWorkspace(role, workspace)) {
    return listTraces({ ...options, filter: () => false });
  }

  return listTraces({
    ...options,
    filter: (t) => t.workspaceId === workspace.id,
  });
}
