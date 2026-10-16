"use client";

import { useRouter } from "next/navigation";
import { MockBadge } from "@/components/MockBadge";
import { setStoredRole } from "@/lib/demo-store";
import { ALL_ROLES, roleLabel } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();

  function choose(role: Role) {
    setStoredRole(role);
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-4">
      <div className="rounded-xl border border-white/10 bg-[#0d2240] p-8 shadow-xl">
        <div className="mb-2 flex items-center gap-2">
          <MockBadge label="Mock SSO" />
          <MockBadge label="No real auth" />
        </div>
        <h1 className="text-2xl font-semibold text-white">
          Nasdaq GenAI Workbench
        </h1>
        <p className="mt-2 text-sm text-cyan-100/70">
          Look-alike demo. Pick a role to continue. Access to workspaces is
          filtered by role; Legal stays locked behind a training gate.
        </p>
        <ul className="mt-6 space-y-2">
          {ALL_ROLES.map((role) => (
            <li key={role}>
              <button
                type="button"
                onClick={() => choose(role)}
                className="w-full rounded border border-white/15 bg-[#071628] px-4 py-3 text-left text-cyan-50 hover:border-cyan-400 hover:bg-[#0a1f3d]"
              >
                <span className="font-medium">{roleLabel(role)}</span>
                <span className="mt-0.5 block text-xs text-cyan-200/50">
                  {role === "admin"
                    ? "All workspaces + Traces"
                    : `Access ${roleLabel(role)} workspace`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
