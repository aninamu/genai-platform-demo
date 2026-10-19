#!/usr/bin/env node
/**
 * Stdio entrypoint for the gateway MCP server.
 * Run: pnpm mcp
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { traceCallerFromEnv } from "../lib/gateway";
import { createMcpServer } from "./mcp-server";

async function main() {
  const transport = new StdioServerTransport();
  await createMcpServer(traceCallerFromEnv()).connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
