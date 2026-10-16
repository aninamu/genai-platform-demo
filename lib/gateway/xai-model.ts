import { DEFAULT_XAI_MODEL } from "@/lib/models";
import { getSeedDocuments } from "@/lib/seed";
import type { GatewayRequest } from "./contracts";

const DEFAULT_BASE_URL = "https://api.x.ai/v1";
// Below the 30s client timeout so the gateway can still record a failure trace.
const XAI_TIMEOUT_MS = 25_000;

export class ProviderNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

export interface XaiConfig {
  apiKey: string | undefined;
  model: string;
  baseUrl: string;
}

export function getXaiConfig(): XaiConfig {
  return {
    apiKey: process.env.XAI_API_KEY || undefined,
    model: process.env.XAI_MODEL || DEFAULT_XAI_MODEL,
    baseUrl: (process.env.XAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
  };
}

export const XAI_MISSING_KEY_MESSAGE =
  "Grok is unavailable: XAI_API_KEY is not set on the server. Add it to .env.local (see .env.example) and restart the app. Simulated Claude models still work.";

export interface XaiModelResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  providerModel: string;
}

interface XaiChatCompletion {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
}

function buildSystemPrompt(request: GatewayRequest): string {
  const seed = getSeedDocuments(request.workspaceId).map(
    (d) => `### ${d.title}\n${d.content}`,
  );
  const uploads = (request.documents ?? []).map(
    (d) => `### ${d.name} (uploaded)\n${d.content}`,
  );
  const docs = [...seed, ...uploads].join("\n\n");
  return [
    "You are an assistant inside a demo enterprise GenAI workbench. All documents below are synthetic sample data, not real company information.",
    "Answer concisely using the documents when relevant, and say so when they do not cover the question.",
    docs ? `\n## Workspace documents\n\n${docs}` : "",
  ].join("\n");
}

/**
 * Real xAI adapter (OpenAI-compatible chat completions). Must only be imported
 * from inside lib/gateway/.
 */
export async function runXaiModel(
  request: GatewayRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<XaiModelResult> {
  const config = getXaiConfig();
  if (!config.apiKey) {
    throw new ProviderNotConfiguredError(XAI_MISSING_KEY_MESSAGE);
  }

  const res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: buildSystemPrompt(request) },
        { role: "user", content: request.input },
      ],
    }),
    signal: AbortSignal.timeout(XAI_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`xAI API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const body = (await res.json()) as XaiChatCompletion;
  const output = body.choices?.[0]?.message?.content ?? "";
  const usage = body.usage ?? {};
  const inputTokens = usage.prompt_tokens ?? 0;
  // xAI bills reasoning tokens as output; total_tokens includes them.
  const outputTokens =
    usage.total_tokens !== undefined
      ? usage.total_tokens - inputTokens
      : (usage.completion_tokens ?? 0) +
        (usage.completion_tokens_details?.reasoning_tokens ?? 0);

  return {
    output,
    inputTokens,
    outputTokens,
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
    providerModel: body.model ?? config.model,
  };
}
