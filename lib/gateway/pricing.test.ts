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

  it("prices Grok from the xAI table, including cached input", () => {
    expect(calculateCost("grok-4.7", 100_000, 100_000).cost).toBe(0.8);
    expect(
      calculateCost("grok-4.7", 100_000, 0, { cachedInputTokens: 100_000 })
        .cost,
    ).toBe(0.05);
  });

  it("bills the whole request at long-context rates past 200k prompt tokens", () => {
    expect(calculateCost("grok-4.7", 200_000, 100_000).cost).toBeCloseTo(
      0.2 * 4 + 0.1 * 12,
      8,
    );
  });
});
