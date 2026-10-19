/**
 * MCP server exposing run_prompt, list_traces, and usage_by_model against the gateway.
 * Importing this module does not start a transport; `pnpm mcp` runs it over stdio
 * via scripts/mcp-stdio.ts.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  executePrompt,
  getUsageSummaryForCaller,
  listTracesForCaller,
  type TraceCaller,
} from "../lib/gateway";
import { DEFAULT_MODEL_ID, MODEL_CATALOG } from "../lib/models";

/**
 * `caller` scopes list_traces and usage_by_model. It comes from the operator's
 * environment (traceCallerFromEnv), never from tool input, so MCP clients cannot
 * self-assert a broader role.
 */
export function createMcpServer(caller: TraceCaller): McpServer {
  const server = new McpServer({
    name: "nasdaq-genai-gateway",
    version: "0.1.0",
  });

  server.tool(
    "run_prompt",
    "Execute a prompt through the GenAI gateway. Simulated Claude models are scripted; xai-grok calls the real xAI API. Tracks input, output, model, tokens, and cost.",
    {
      input: z.string().describe("Prompt text"),
      model: z
        .string()
        .default(DEFAULT_MODEL_ID)
        .describe(`Model id: ${MODEL_CATALOG.map((m) => m.id).join(", ")}`),
      caller: z.string().default("mcp").describe("Caller identity"),
      workspaceId: z.string().optional(),
      workflowId: z.string().optional(),
    },
    async ({ input, model, caller, workspaceId, workflowId }) => {
      const result = await executePrompt({
        input,
        model,
        caller,
        workspaceId,
        workflowId,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "list_traces",
    "List gateway traces with simulated usage and cost, scoped to the server operator's MCP_ROLE and MCP_WORKSPACE_ID. Admins see all workspaces; other roles see only their own workspace. Without both set, no traces are returned.",
    {
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    async ({ cursor, limit }) => {
      const result = listTracesForCaller(caller, { cursor, limit });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    "usage_by_model",
    "Traffic share, cost, and average latency per model, aggregated from gateway traces, scoped to the server operator's MCP_ROLE and MCP_WORKSPACE_ID. Admins see totals for all workspaces; other roles see only their own workspace. Without both set, usage is empty.",
    {
      source: z
        .enum(["all", "live", "sample"])
        .default("all")
        .describe("Include live traces, seeded sample history, or both"),
    },
    async ({ source }) => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(getUsageSummaryForCaller(caller, source), null, 2),
        },
      ],
    }),
  );

  return server;
}
