# Nasdaq GenAI Workbench (Demo)

Look-alike approximation of an internal GenAI platform for demos. **Not a Nasdaq system.** Synthetic documents, scripted answers, and a gateway that traces input, output, model, tokens, and cost.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # optional: add XAI_API_KEY for real Grok calls
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), pick a mock SSO role, and try Sales chat + workflows. The **Agents** tab emulates four BDK workflows (Capital Access, meeting prep with X context, corporate-action triage, desktop→phone research) without embedding Grok Bot natively.

## Models

Chat and workflows have a model picker. Every option goes through the same gateway and trace path.

| Gateway model id | What it does | Cost |
| --- | --- | --- |
| `xai-grok` (default) | **Real** call to the xAI API when `XAI_API_KEY` is set; Agents desk falls back to scripted packets without a key | Real xAI usage × xAI list price (or simulated on agent fallback) |
| `bedrock-claude-opus-sim` | Scripted answers, simulated Bedrock Claude Opus | Simulated |
| `bedrock-claude-sonnet-sim` | Scripted answers, simulated Claude Sonnet | Simulated |
| `bedrock-claude-haiku-sim` | Scripted answers, simulated Claude Haiku | Simulated |

Grok configuration (server-side env, see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `XAI_API_KEY` | _(unset)_ | xAI API key. If unset, Grok requests fail with a clear "Grok is unavailable" message (HTTP 503) and an error trace; Claude models keep working. |
| `XAI_MODEL` | `grok-4.7` | xAI model id. Needs a row in `lib/gateway/pricing.ts` or cost is recorded as `null` with a reason. |
| `XAI_BASE_URL` | `https://api.x.ai/v1` | xAI endpoint. |

Grok traces have `simulated: false` and `providerModel` (for example `grok-4.7`). Output tokens include reasoning tokens. Cached input and the 200k+ prompt long-context tier are priced per [xAI's model pricing](https://docs.x.ai/docs/models). Tests mock `fetch` and never call xAI.

## Traffic by model

The admin **Traces** page shows traffic share (requests and %), total and average cost, and average latency per model, aggregated from gateway traces (`GET /api/v1/usage?source=all|live|sample`).

**Load sample history** (or `pnpm seed:sample`) adds 500 traces labeled as sample data, spread over the last 30 days: Claude Opus is the default and dominates (70%), and Grok is 3.6% (18 requests). Sample traces have `sample: true`, never call a model, and are replaced on reseed. Live traces are left untouched.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Next.js app |
| `pnpm test` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm mcp` | MCP stdio server (`run_prompt`, `list_traces`, `usage_by_model`) |
| `pnpm seed:sample` | Seed labeled sample traffic history |

## Gateway access

Every prompt goes through `lib/gateway`:

- `POST /api/v1/completions`
- `GET /api/v1/traces?role=&workspaceId=&cursor=&limit=` (admins see all traces; other roles see only their own workspace; missing or invalid caller info returns an empty list)
- `GET /api/v1/usage?source=all|live|sample`
- `POST /api/v1/traces/sample` (seed sample history)
- `GET /api/v1/models` (catalog + whether Grok is configured)
- MCP tools via `pnpm mcp` (see `.cursor/mcp.json`). `list_traces` is scoped to the operator's `MCP_ROLE` and `MCP_WORKSPACE_ID` environment variables, not tool input; `.cursor/mcp.json` defaults them to `engineer` / `engineering`, and unset or unknown values return no traces.
- Typed client: `createGatewayClient()` from `lib/gateway`

Traces are stored in `.data/traces.json` (gitignored).
