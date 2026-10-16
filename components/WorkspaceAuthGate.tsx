"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole } from "@/lib/demo-store";
import { canAccessWorkspace } from "@/lib/permissions";
import type { Role, Workspace } from "@/lib/types";

export function WorkspaceAuthGate({
  workspace,
  children,
  fallbackRedirect,
}: {
  workspace: Workspace;
  fallbackRedirect: string;
  children: (role: Role) => React.ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null | undefined>(undefined);

  useEffect(() => {
    const stored = getStoredRole();
    if (!stored) {
      router.replace("/login");
      return;
    }
    if (!canAccessWorkspace(stored, workspace)) {
      router.replace(fallbackRedirect);
      return;
    }
    setRole(stored);
  }, [router, workspace, fallbackRedirect]);

  if (role === undefined) {
    return <p className="text-sm text-cyan-100/60">Loading workspace…</p>;
  }
  if (!role) return null;
  return <>{children(role)}</>;
}
