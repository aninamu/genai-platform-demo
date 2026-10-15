import { describe, expect, it } from "vitest";
import { calculateCost } from "./pricing";

describe("calculateCost", () => {
  it("never returns zero for unknown models", () => {
    const result = calculateCost("not-a-real-model", 1000, 1000);
    expect(result.cost).toBeNull();
    expect(result.costUnavailableReason).toBeTruthy();
  });

  it("computes USD from the versioned table", () => {
    const result = calculateCost("bedrock-claude-sonnet-sim", 1_000_000, 1_000_000);
    expect(result.cost).toBe(18);
    expect(result.currency).toBe("USD");
  });
});
