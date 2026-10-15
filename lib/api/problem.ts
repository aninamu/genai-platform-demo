import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import type { ProblemDetails } from "@/lib/gateway/contracts";

export function problemResponse(
  status: number,
  title: string,
  detail: string,
  instance: string,
  type = "https://api.example.com/problems/request-error",
): NextResponse<ProblemDetails> {
  const body: ProblemDetails = {
    type,
    title,
    status,
    detail,
    instance,
    traceId: randomUUID(),
  };
  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}
