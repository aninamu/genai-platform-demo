import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach } from "vitest";
import {
  resetTraceStoreForTests,
  setTraceStorePathForTests,
} from "@/lib/gateway/trace-store";

// Tests must never read, write, or delete the repo's real .data/traces.json,
// which a running `pnpm dev` or `pnpm mcp` may be using.
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gw-test-data-"));
const testStorePath = path.join(testDataDir, "traces.json");
setTraceStorePathForTests(testStorePath);

afterEach(() => {
  resetTraceStoreForTests();
  setTraceStorePathForTests(testStorePath);
});

afterAll(() => {
  fs.rmSync(testDataDir, { recursive: true, force: true });
});
