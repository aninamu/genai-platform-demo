import { describe, expect, it } from "vitest";
import {
  ALL_ROLES,
  canAccessWorkspace,
  getLegalAccessState,
  roleLabel,
} from "./permissions";
import { getWorkspaces } from "./seed";

describe("permissions", () => {
  it("gates workspaces by role", () => {
    const sales = getWorkspaces().find((w) => w.id === "sales")!;
    expect(canAccessWorkspace("sales", sales)).toBe(true);
    expect(canAccessWorkspace("engineer", sales)).toBe(false);
    expect(canAccessWorkspace("admin", sales)).toBe(true);
  });

  it("keeps Legal locked for training", () => {
    for (const role of ALL_ROLES) {
      expect(getLegalAccessState(role).status).toBe("locked");
    }
  });

  it("labels every role exhaustively", () => {
    for (const role of ALL_ROLES) {
      expect(roleLabel(role).length).toBeGreaterThan(0);
    }
  });
});
