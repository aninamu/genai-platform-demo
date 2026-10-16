"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DemoBanner } from "./DemoBanner";
import { MockBadge } from "./MockBadge";
import { clearStoredRole, getStoredRole } from "@/lib/demo-store";
import { roleLabel } from "@/lib/permissions";
import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    setRole(getStoredRole());
  }, [pathname]);

  if (pathname === "/login") {
    return (
      <>
        <DemoBanner />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DemoBanner />
      <header className="border-b border-white/10 bg-[#0a1f3d]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              Nasdaq GenAI Workbench
              <span className="ml-2 text-xs font-normal text-cyan-300/80">
                (look-alike demo)
              </span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-cyan-100/80 sm:flex">
              <Link href="/" className="hover:text-white">
                Workspaces
              </Link>
              {role === "admin" && (
                <Link href="/traces" className="hover:text-white">
                  Traces
                </Link>
              )}
              <Link href="/about-demo" className="hover:text-white">
                About
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {role && (
              <>
                <MockBadge label="Mock SSO" />
                <span className="text-sm text-cyan-100">{roleLabel(role)}</span>
                <button
                  type="button"
                  className="rounded border border-white/20 px-2 py-1 text-xs text-cyan-100 hover:bg-white/10"
                  onClick={() => {
                    clearStoredRole();
                    router.push("/login");
                  }}
                >
                  Switch role
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
