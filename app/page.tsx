"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { MockBadge } from "@/components/MockBadge";
import { getWorkspacesClient } from "@/lib/seed-client";
import {
  canAccessWorkspace,
  getLegalAccessState,
  roleLabel,
} from "@/lib/permissions";
import type { Role } from "@/lib/types";

function HomeContent({ role }: { role: Role }) {
  const workspaces = getWorkspacesClient();
  const legal = getLegalAccessState(role);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Workspaces</h1>
        <p className="mt-2 max-w-2xl text-sm text-cyan-100/70">
          Signed in as <strong className="text-cyan-50">{roleLabel(role)}</strong>{" "}
          via mock SSO. Cards reflect role permissions from public descriptions
          of Nasdaq&apos;s internal GenAI adoption.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {workspaces.map((ws) => {
          const allowed = canAccessWorkspace(role, ws);
          const card = (
            <div
              className={`rounded-xl border p-5 ${
                allowed
                  ? "border-cyan-500/30 bg-[#0d2240] hover:border-cyan-400"
                  : "border-white/10 bg-[#0a1628] opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">{ws.name}</h2>
                {!allowed && <MockBadge label="No permission" />}
              </div>
              <p className="mt-2 text-sm text-cyan-100/70">{ws.description}</p>
              {!allowed && (
                <p className="mt-3 text-xs text-amber-200/80">
                  Your role does not include this workspace. Switch to{" "}
                  {ws.allowedRoles.map(roleLabel).join(" / ")}.
                </p>
              )}
            </div>
          );

          return allowed ? (
            <Link key={ws.id} href={`/workspaces/${ws.id}`}>
              {card}
            </Link>
          ) : (
            <div key={ws.id}>{card}</div>
          );
        })}

        <div className="rounded-xl border border-amber-500/30 bg-[#0a1628] p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Legal</h2>
            <MockBadge label="Training required" />
          </div>
          <p className="mt-2 text-sm text-cyan-100/70">
            Governance example only. Public reporting noted Legal was more
            cautious; this card stays locked pending AI usage training.
          </p>
          {legal.status === "locked" && (
            <p className="mt-3 text-xs text-amber-200/90">
              Complete AI usage training to request access. No Legal workflow is
              invented in this demo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return <RequireAuth>{(role) => <HomeContent role={role} />}</RequireAuth>;
}
