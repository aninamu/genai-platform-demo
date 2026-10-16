import { listTraces } from "@/lib/gateway";
import { problemResponse } from "@/lib/api/problem";

export const runtime = "nodejs";

// Public by design: this demo has no server-side auth (mock roles live in browser
// localStorage), so there is no session to verify. Do not expose beyond local demos.
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

  const result = listTraces({ cursor, limit });
  return Response.json(result);
}
