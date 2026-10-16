import { getUsageSummary } from "@/lib/gateway";
import type { UsageSource } from "@/lib/gateway/contracts";
import { problemResponse } from "@/lib/api/problem";

export const runtime = "nodejs";

const SOURCES: UsageSource[] = ["all", "live", "sample"];

// Public by design: this demo has no server-side auth (mock roles live in browser
// localStorage), so there is no session to verify. Do not expose beyond local demos.
export async function GET(request: Request) {
  const source = (new URL(request.url).searchParams.get("source") ??
    "all") as UsageSource;
  if (!SOURCES.includes(source)) {
    return problemResponse(
      400,
      "Validation Error",
      "source must be one of all, live, sample",
      "/api/v1/usage",
      "https://api.example.com/problems/validation-error",
    );
  }
  return Response.json(getUsageSummary(source));
}
