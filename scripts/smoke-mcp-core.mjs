import { executePrompt, listTraces } from "../lib/gateway/index.ts";

const r = await executePrompt({
  input: "MCP smoke ping for failover gateway",
  model: "bedrock-claude-sonnet-sim",
  caller: "mcp-smoke",
  workspaceId: "engineering",
});
console.log(
  JSON.stringify(
    {
      status: r.status,
      correlationId: r.correlationId,
      cost: r.cost,
      simulated: r.simulated,
      traceCount: listTraces({ limit: 100 }).data.length,
    },
    null,
    2,
  ),
);
