"use client";

import { AgentsDesk } from "@/components/AgentsDesk";
import { RequireAuth } from "@/components/RequireAuth";

export default function AgentsPage() {
  return (
    <RequireAuth>
      {() => <AgentsDesk />}
    </RequireAuth>
  );
}
