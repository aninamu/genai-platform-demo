import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GROK_MODEL_ID } from "@/lib/models";
import { executePrompt, PROVIDER_NOT_CONFIGURED_TYPE } from "./execute";
import { listTraces, setTraceStorePathForTests } from "./trace-store";

function xaiResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Grok via xAI through the gateway", () => {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-xai-"));
    setTraceStorePathForTests(path.join(dir, "traces.json"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("calls the xAI API and traces real usage and cost", async () => {
    vi.stubEnv("XAI_API_KEY", "test-key");
    vi.stubEnv("XAI_MODEL", "grok-4.7");
    const fetchMock = vi.fn().mockResolvedValue(
      xaiResponse({
        model: "grok-4.7",
        choices: [{ message: { content: "Fail over by promoting the standby." } }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 200,
          total_tokens: 1500,
          prompt_tokens_details: { cached_tokens: 400 },
          completion_tokens_details: { reasoning_tokens: 300 },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await executePrompt({
      input: "How do I fail over the market data gateway?",
      model: GROK_MODEL_ID,
      caller: "test",
      workspaceId: "engineering",
      stream: true,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.x.ai/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe("grok-4.7");
    expect(sent.messages.at(-1)).toEqual({
      role: "user",
      content: "How do I fail over the market data gateway?",
    });

    expect(res.status).toBe("success");
    expect(res.simulated).toBe(false);
    expect(res.providerModel).toBe("grok-4.7");
    expect(res.output).toBe("Fail over by promoting the standby.");
    expect(res.inputTokens).toBe(1000);
    // completion + reasoning tokens are both billed as output
    expect(res.outputTokens).toBe(500);
    // 600 uncached * $2 + 400 cached * $0.50 + 500 output * $6, per 1M
    expect(res.cost).toBeCloseTo(0.0012 + 0.0002 + 0.003, 10);

    const [trace] = listTraces({ limit: 1 }).data;
    expect(trace.model).toBe(GROK_MODEL_ID);
    expect(trace.providerModel).toBe("grok-4.7");
    expect(trace.simulated).toBe(false);
    expect(trace.output).toBe(res.output);
    expect(trace.cost).toBe(res.cost);
  });

  it("degrades with a clear message and an error trace when the key is missing", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await executePrompt({
      input: "hello",
      model: GROK_MODEL_ID,
      caller: "test",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe("error");
    expect(res.error?.type).toBe(PROVIDER_NOT_CONFIGURED_TYPE);
    expect(res.error?.detail).toMatch(/XAI_API_KEY is not set/);
    expect(res.cost).toBeNull();

    const [trace] = listTraces({ limit: 1 }).data;
    expect(trace.status).toBe("error");
    expect(trace.model).toBe(GROK_MODEL_ID);
  });

  it("records upstream API failures as gateway errors", async () => {
    vi.stubEnv("XAI_API_KEY", "bad-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(xaiResponse({ error: "Incorrect API key" }, 401)),
    );

    const res = await executePrompt({
      input: "hello",
      model: GROK_MODEL_ID,
      caller: "test",
    });

    expect(res.status).toBe("error");
    expect(res.error?.detail).toMatch(/xAI API error 401/);
    expect(listTraces({ limit: 1 }).data[0].status).toBe("error");
  });
});
