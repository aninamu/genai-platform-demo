import fs from "node:fs";
import path from "node:path";
import type { GatewayTrace, TraceListResult } from "./contracts";

const DEFAULT_DIR = path.join(process.cwd(), ".data");
const DEFAULT_FILE = path.join(DEFAULT_DIR, "traces.json");

let overridePath: string | null = null;

function storePath(): string {
  return overridePath ?? DEFAULT_FILE;
}

// Always read from disk: Next.js and the MCP server are separate processes sharing this file.
function ensureLoaded(): GatewayTrace[] {
  const file = storePath();
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, "utf8");
      return JSON.parse(raw) as GatewayTrace[];
    }
  } catch {
    // fall through to empty store
  }
  return [];
}

function persist(traces: GatewayTrace[]): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(traces, null, 2), "utf8");
}

export function appendTrace(trace: GatewayTrace): GatewayTrace {
  const traces = ensureLoaded();
  traces.unshift(trace);
  persist(traces);
  return trace;
}

export function listTraces(options?: {
  cursor?: string | null;
  limit?: number;
}): TraceListResult {
  const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
  const traces = ensureLoaded();
  let start = 0;

  if (options?.cursor) {
    const idx = traces.findIndex((t) => t.id === options.cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }

  const slice = traces.slice(start, start + limit);
  const next =
    start + limit < traces.length ? slice[slice.length - 1]?.id ?? null : null;

  return {
    data: slice,
    paging: {
      nextCursor: next,
      limit,
    },
  };
}

export function getTraceByCorrelationId(
  correlationId: string,
): GatewayTrace | undefined {
  return ensureLoaded().find((t) => t.correlationId === correlationId);
}

export function findTraceByIdempotencyKey(
  key: string,
): GatewayTrace | undefined {
  return ensureLoaded().find(
    (t) =>
      t.id === `idem-${key}` ||
      (t as GatewayTrace & { idempotencyKey?: string }).idempotencyKey === key,
  );
}

/** Test helper: point the store at a temp file. */
export function setTraceStorePathForTests(filePath: string): void {
  overridePath = filePath;
}

export function resetTraceStoreForTests(): void {
  if (overridePath) {
    try {
      fs.rmSync(overridePath, { force: true });
    } catch {
      // ignore
    }
  } else {
    try {
      fs.rmSync(DEFAULT_FILE, { force: true });
    } catch {
      // ignore
    }
  }
}
