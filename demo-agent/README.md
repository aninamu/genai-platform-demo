# Demo agent

Host collects the PR into `pr.md` and `files.md`. The agent records a
walkthrough and comments the result.

```text
npx @grok/agent-sdk init ./my-demo --template demo
```

`init` asks which repos to watch. Skip the prompt with
`--var repos=aninamu/genai-platform-demo`.

## Run

Connect GitHub in Cursor for those repos. Then sign the host in:

```text
agent-sdk login
agent-sdk dev
```

In the playground, run `/queue/pr` with a PR URL or `aninamu/genai-platform-demo#N` from
a watched repo. On GitHub, label a PR `demo` or comment `/demo`. Events
and API calls use your Cursor GitHub connection. Turns are sandboxed
with `read` and `grep` only.

```text
POST /<slug>/v1/channels/queue/pr
```

`agent-sdk eval` skips the GitHub comment.

## Files to edit

- `bot/lib/repos.ts`: watched repos
- `bot/instructions.md`: how to record
- `evals/demo.eval.ts`: smoke case
