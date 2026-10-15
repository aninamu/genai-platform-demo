import { seedSampleTraffic } from "@/lib/gateway";

export const runtime = "nodejs";

// Public by design: this demo has no server-side auth (mock roles live in browser
// localStorage), so there is no session to verify. Do not expose beyond local demos.
// Idempotent: replaces previously seeded sample traces and leaves live traces untouched.
export async function POST() {
  return Response.json(seedSampleTraffic());
}
