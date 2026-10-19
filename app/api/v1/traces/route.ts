import { listTracesForCaller } from "@/lib/gateway";
import { problemResponse } from "@/lib/api/problem";
import { ALL_ROLES } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";

function parseRole(value: string | null): Role | undefined {
  return ALL_ROLES.find((r) => r === value);
}

// Public by design: this demo has no server-side auth (mock roles live in browser
// localStorage), so role and workspaceId are caller-asserted, not verified.
// Do not expose beyond local demos.
export async function GET(request: Request) {
  const instance = "/api/v1/traces";
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 25;

  if (Number.isNaN(limit) || limit < 1 || limit > 100) {
    return problemResponse(
      400,
      "Validation Error",
      "limit must be between 1 and 100",
      instance,
      "https://api.example.com/problems/validation-error",
    );
  }

  const result = listTracesForCaller(
    {
      role: parseRole(url.searchParams.get("role")),
      workspaceId: url.searchParams.get("workspaceId") ?? undefined,
    },
    { cursor, limit },
  );
  return Response.json(result);
}
