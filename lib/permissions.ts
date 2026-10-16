import type { Role, Workspace } from "./types";

export function canAccessWorkspace(role: Role, workspace: Workspace): boolean {
  if (role === "admin") return true;
  return workspace.allowedRoles.includes(role);
}

export type LegalAccessState =
  | { status: "locked"; reason: "training-required" }
  | { status: "unlocked" };

/**
 * Legal is a governance example only — locked pending AI usage training.
 * Admin can view the explanation but the card stays locked (no invented workflow).
 */
export function getLegalAccessState(role: Role): LegalAccessState {
  void role;
  return {
    status: "locked",
    reason: "training-required",
  };
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "engineer":
      return "Engineer";
    case "sales":
      return "Sales";
    case "support":
      return "Support";
    case "data-ops":
      return "Data Operations";
    case "admin":
      return "Admin";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export const ALL_ROLES: Role[] = [
  "engineer",
  "sales",
  "support",
  "data-ops",
  "admin",
];
