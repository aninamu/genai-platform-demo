import { ALL_ROLES, canAccessWorkspace } from "@/lib/permissions";
import { getWorkspace } from "@/lib/seed";
import type { Role } from "@/lib/types";
import type {
  GatewayTrace,
  TraceListResult,
  UsageSource,
  UsageSummary,
} from "./contracts";
import { listAllTraces, listTraces } from "./trace-store";
import { summarizeUsage } from "./usage";

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
function traceFilterForCaller(
  caller: TraceCaller,
): ((trace: GatewayTrace) => boolean) | undefined {
  const { role, workspaceId } = caller;
  if (role === "admin") return undefined;

  const workspace = workspaceId ? getWorkspace(workspaceId) : undefined;
  if (!role || !workspace || !canAccessWorkspace(role, workspace)) {
    return () => false;
  }
  return (t) => t.workspaceId === workspace.id;
}

export function listTracesForCaller(
  caller: TraceCaller,
  options?: { cursor?: string | null; limit?: number },
): TraceListResult {
  return listTraces({ ...options, filter: traceFilterForCaller(caller) });
}

export function getUsageSummaryForCaller(
  caller: TraceCaller,
  source: UsageSource = "all",
): UsageSummary {
  const filter = traceFilterForCaller(caller);
  const traces = listAllTraces();
  return summarizeUsage(filter ? traces.filter(filter) : traces, source);
}
