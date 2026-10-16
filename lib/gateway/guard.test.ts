import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === ".git" ||
      entry.name === ".data"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

describe("gateway architectural guard", () => {
  it("no module outside lib/gateway imports a model adapter", () => {
    const root = process.cwd();
    const offenders: string[] = [];

    for (const file of walk(root)) {
      const rel = path.relative(root, file);
      if (rel.startsWith(`lib/gateway${path.sep}`) || rel.startsWith("lib/gateway/")) {
        continue;
      }
      // allow this test file
      if (rel.includes("guard.test")) continue;

      const text = fs.readFileSync(file, "utf8");
      const importsMock =
        /from\s+["'][^"']*mock-model["']/.test(text) ||
        /import\s*\(\s*["'][^"']*mock-model["']/.test(text) ||
        /\brunMockModel\b/.test(text) ||
        /\bstreamMockModel\b/.test(text) ||
        /from\s+["'][^"']*xai-model["']/.test(text) ||
        /\brunXaiModel\b/.test(text) ||
        /api\.x\.ai/.test(text);
      if (importsMock) {
        offenders.push(rel);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("chat and workflows call the gateway client, not the mock model", () => {
    const workspace = fs.readFileSync(
      path.join(process.cwd(), "components/WorkspaceView.tsx"),
      "utf8",
    );
    const workflow = fs.readFileSync(
      path.join(process.cwd(), "components/PresetWorkflow.tsx"),
      "utf8",
    );

    expect(workspace).toMatch(/createGatewayClient/);
    expect(workspace).toMatch(/client\.complete/);
    expect(workspace).not.toMatch(/runMockModel/);

    expect(workflow).toMatch(/createGatewayClient/);
    expect(workflow).toMatch(/client\.complete/);
    expect(workflow).not.toMatch(/runMockModel/);
  });
});
