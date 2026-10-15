# Nasdaq GenAI Workbench (Demo)

Look-alike approximation of an internal GenAI platform for demos. **Not a Nasdaq system.** Synthetic documents, scripted answers, and a mock gateway that traces input, output, model, tokens, and cost.

## Quick start

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), pick a mock SSO role, and try Sales chat + workflows.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js app |
| `pnpm test` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm mcp` | MCP stdio server (`run_prompt`, `list_traces`) |

## Gateway access

Every prompt goes through `lib/gateway`:

- `POST /api/v1/completions`
- `GET /api/v1/traces?cursor=&limit=`
- MCP tools via `pnpm mcp` (see `.cursor/mcp.json`)
- Typed client: `createGatewayClient()` from `lib/gateway`

Traces are stored in `.data/traces.json` (gitignored).
