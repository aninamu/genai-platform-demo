import { GROK_MODEL_ID } from "@/lib/models";
import {
  getAgentStep,
  getScriptedResponses,
  getSeedDocuments,
  getWorkflow,
  renderTemplate,
} from "@/lib/seed";
import type { GatewayCitation, GatewayRequest } from "./contracts";

export interface MockModelResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
  citations: GatewayCitation[];
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function snippetAround(content: string, keyword: string): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx < 0) return content.slice(0, 160);
  const start = Math.max(0, idx - 40);
  return content.slice(start, start + 180).trim();
}

function matchUploadedDocument(
  request: GatewayRequest,
  allowContentMatch: boolean,
): { output: string; citations: GatewayCitation[] } | null {
  const docs = request.documents ?? [];
  if (docs.length === 0) return null;

  const input = request.input.toLowerCase();
  for (const doc of docs) {
    const words = doc.content
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 4);
    const hit = allowContentMatch && words.find((w) => input.includes(w));
    if (hit || input.includes(doc.name.toLowerCase().replace(/\.\w+$/, ""))) {
      const snippet = doc.content.slice(0, 200).trim();
      return {
        output: `Based on your uploaded document "${doc.name}" (stored in this browser for the demo):\n\n${snippet}${doc.content.length > 200 ? "…" : ""}\n\n_Scripted response grounded in the uploaded file._`,
        citations: [
          {
            documentId: doc.id,
            title: doc.name,
            snippet,
            score: 0.91,
          },
        ],
      };
    }
  }
  return null;
}

function simulateRetrieval(
  workspaceId: string | undefined,
  input: string,
  citationIds: string[],
): GatewayCitation[] {
  const docs = getSeedDocuments(workspaceId);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const citations: GatewayCitation[] = [];

  for (const id of citationIds) {
    const doc = byId.get(id);
    if (!doc) continue;
    const keyword =
      input
        .toLowerCase()
        .split(/\W+/)
        .find((w) => doc.content.toLowerCase().includes(w)) ?? "";
    citations.push({
      documentId: doc.id,
      title: doc.title,
      snippet: snippetAround(doc.content, keyword),
      score: 0.82 + Math.min(0.15, citationIds.length * 0.02),
    });
  }

  if (citations.length === 0 && docs.length > 0) {
    const doc = docs[0];
    citations.push({
      documentId: doc.id,
      title: doc.title,
      snippet: doc.content.slice(0, 160),
      score: 0.55,
    });
  }

  return citations;
}

/**
 * Sole model adapter. Must only be imported from inside lib/gateway/.
 */
export async function runMockModel(
  request: GatewayRequest,
): Promise<MockModelResult> {
  if (request.input.trim().toLowerCase() === "__force_error__") {
    throw new Error("Simulated model failure");
  }

  if (request.agentStepId) {
    const hit = getAgentStep(request.agentStepId);
    if (!hit) {
      throw new Error(`Unknown agent step: ${request.agentStepId}`);
    }
    const useX =
      request.model === GROK_MODEL_ID && Boolean(hit.step.outputWithX);
    const output = useX
      ? (hit.step.outputWithX as string)
      : hit.step.output;
    const citations = simulateRetrieval(
      request.workspaceId ?? hit.agent.workspaceId,
      request.input,
      hit.step.citationIds,
    );
    return {
      output,
      inputTokens: estimateTokens(request.input),
      outputTokens: estimateTokens(output),
      citations,
    };
  }

  if (request.workflowId) {
    const workflow = getWorkflow(request.workflowId);
    if (!workflow) {
      throw new Error(`Unknown workflow: ${request.workflowId}`);
    }

    const values: Record<string, string> = {};
    for (const field of workflow.inputs) {
      values[field.id] = field.defaultValue ?? "";
    }
    // Parse "key: value" lines appended by the UI after the template.
    for (const line of request.input.split("\n")) {
      const m = line.match(/^\[input:(\w+)\]\s*(.*)$/);
      if (m) values[m[1]] = m[2];
    }

    const output = renderTemplate(workflow.output, values);
    return {
      output,
      inputTokens: estimateTokens(request.input),
      outputTokens: estimateTokens(output),
      citations: [],
    };
  }

  const responses = getScriptedResponses().filter(
    (r) => !request.workspaceId || r.workspaceId === request.workspaceId,
  );
  const input = request.input.toLowerCase();

  let best = responses[0];
  let bestScore = -1;
  for (const response of responses) {
    let score = 0;
    for (const keyword of response.keywords) {
      if (input.includes(keyword.toLowerCase())) score += keyword.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = response;
    }
  }

  // Loose content-word matching only applies when no scripted answer matched.
  const uploaded = matchUploadedDocument(request, bestScore <= 0);
  if (uploaded) {
    return {
      output: uploaded.output,
      inputTokens: estimateTokens(request.input),
      outputTokens: estimateTokens(uploaded.output),
      citations: uploaded.citations,
    };
  }

  const fallback =
    bestScore <= 0
      ? {
          answer:
            "I could not find a strong match in the synthetic sample documents. Try a suggested prompt, or upload a Markdown/text file and ask about it.\n\n_Scripted fallback response._",
          citationIds: [] as string[],
        }
      : best;

  const citations = simulateRetrieval(
    request.workspaceId,
    request.input,
    fallback.citationIds ?? best.citationIds,
  );

  const output = fallback.answer;
  return {
    output,
    inputTokens: estimateTokens(request.input),
    outputTokens: estimateTokens(output),
    citations,
  };
}

export async function* streamMockModel(
  request: GatewayRequest,
): AsyncGenerator<string, MockModelResult, void> {
  const result = await runMockModel(request);
  const chunkSize = 24;
  for (let i = 0; i < result.output.length; i += chunkSize) {
    yield result.output.slice(i, i + chunkSize);
    await new Promise((r) => setTimeout(r, 5));
  }
  return result;
}
