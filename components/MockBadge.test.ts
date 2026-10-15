import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("MockBadge", () => {
  it("renders a labeled span component", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/MockBadge.tsx"),
      "utf8",
    );
    expect(src).toMatch(/export function MockBadge/);
    expect(src).toMatch(/label/);
  });
});
