import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { executePrompt } from "./execute";
import { setTraceStorePathForTests } from "./trace-store";

/**
 * Parity across surfaces: API route handlers and MCP both call executePrompt.
 * We exercise the shared core and assert response shape fields required by contracts.
 */
describe("gateway surface parity", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-parity-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
  });

  it("executePrompt response shape matches client/API/MCP contract", async () => {
    const res = await executePrompt({
      input: "How do I escalate a P1 connectivity outage?",
      model: "bedrock-claude-haiku-sim",
      caller: "parity",
      workspaceId: "support",
    });

    expect(res).toEqual(
      expect.objectContaining({
        output: expect.any(String),
        model: "bedrock-claude-haiku-sim",
        inputTokens: expect.any(Number),
        outputTokens: expect.any(Number),
        totalTokens: expect.any(Number),
        currency: "USD",
        latencyMs: expect.any(Number),
        status: "success",
        correlationId: expect.any(String),
        simulated: true,
      }),
    );
    expect(res).toHaveProperty("cost");
  });

  it("API and MCP modules import executePrompt / listTraces from gateway", () => {
    const api = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/completions/route.ts"),
      "utf8",
    );
    const traces = fs.readFileSync(
      path.join(process.cwd(), "app/api/v1/traces/route.ts"),
      "utf8",
    );
    const mcp = fs.readFileSync(
      path.join(process.cwd(), "scripts/mcp-server.ts"),
      "utf8",
    );
    const client = fs.readFileSync(
      path.join(process.cwd(), "lib/gateway/client.ts"),
      "utf8",
    );

    expect(api).toMatch(/executePrompt/);
    expect(traces).toMatch(/listTraces/);
    expect(mcp).toMatch(/executePrompt/);
    expect(mcp).toMatch(/listTraces/);
    expect(client).toMatch(/\/api\/v1\/completions/);
    expect(client).toMatch(/\/api\/v1\/traces/);
  });
});
