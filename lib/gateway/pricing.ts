export const PRICING_TABLE_VERSION = "2026-10";

/** USD per 1M tokens. Simulated demo prices only. */
const PRICE_TABLE: Record<
  string,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  "bedrock-claude-sonnet-sim": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  "bedrock-claude-haiku-sim": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
  },
};

export interface CostResult {
  cost: number | null;
  currency: string;
  costUnavailableReason?: string;
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): CostResult {
  const entry = PRICE_TABLE[model];
  if (!entry) {
    return {
      cost: null,
      currency: "USD",
      costUnavailableReason: `No price entry for model "${model}" in table ${PRICING_TABLE_VERSION}`,
    };
  }

  const cost =
    (inputTokens / 1_000_000) * entry.inputPerMillion +
    (outputTokens / 1_000_000) * entry.outputPerMillion;

  return {
    cost: Number(cost.toFixed(8)),
    currency: "USD",
  };
}

export function listPricedModels(): string[] {
  return Object.keys(PRICE_TABLE);
}
