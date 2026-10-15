"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredRole } from "@/lib/demo-store";
import type { Role } from "@/lib/types";

export function RequireAuth({
  children,
  allow,
}: {
  children: (role: Role) => React.ReactNode;
  allow?: readonly Role[];
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role | null | undefined>(undefined);
  const allowKey = allow?.join(",") ?? "";

  useEffect(() => {
    const stored = getStoredRole();
    if (!stored) {
      router.replace("/login");
      return;
    }
    const allowedRoles = allowKey
      ? (allowKey.split(",") as Role[])
      : null;
    if (allowedRoles && !allowedRoles.includes(stored)) {
      router.replace("/");
      return;
    }
    setRole(stored);
  }, [router, allowKey]);

  if (role === undefined) {
    return (
      <p className="text-sm text-cyan-100/60" aria-live="polite">
        Loading…
      </p>
    );
  }
  if (!role) return null;
  return <>{children(role)}</>;
}
