import { getUsageSummaryForCaller } from "@/lib/gateway";
import type { UsageSource } from "@/lib/gateway/contracts";
import { problemResponse } from "@/lib/api/problem";
import { ALL_ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

const SOURCES: UsageSource[] = ["all", "live", "sample"];

function parseRole(value: string | null): Role | undefined {
  return ALL_ROLES.find((r) => r === value);
}

// Public by design: this demo has no server-side auth (mock roles live in browser
// localStorage), so role and workspaceId are caller-asserted, not verified.
// Do not expose beyond local demos.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = (url.searchParams.get("source") ?? "all") as UsageSource;
  if (!SOURCES.includes(source)) {
    return problemResponse(
      400,
      "Validation Error",
      "source must be one of all, live, sample",
      "/api/v1/usage",
      "https://api.example.com/problems/validation-error",
    );
  }
  return Response.json(
    getUsageSummaryForCaller(
      {
        role: parseRole(url.searchParams.get("role")),
        workspaceId: url.searchParams.get("workspaceId") ?? undefined,
      },
      source,
    ),
  );
}
