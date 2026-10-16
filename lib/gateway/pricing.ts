export const PRICING_TABLE_VERSION = "2026-10";

interface PriceRates {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
}

interface PriceEntry extends PriceRates {
  /** Whole request is billed at these rates once the prompt reaches the threshold. */
  longContext?: PriceRates & { promptTokenThreshold: number };
}

const XAI_LONG_CONTEXT_THRESHOLD = 200_000;

function xaiEntry(
  input: number,
  cached: number,
  output: number,
): PriceEntry {
  return {
    inputPerMillion: input,
    cachedInputPerMillion: cached,
    outputPerMillion: output,
    longContext: {
      promptTokenThreshold: XAI_LONG_CONTEXT_THRESHOLD,
      inputPerMillion: input * 2,
      cachedInputPerMillion: cached * 2,
      outputPerMillion: output * 2,
    },
  };
}

/**
 * USD per 1M tokens. `*-sim` rows are simulated demo prices; xAI rows follow
 * https://docs.x.ai/docs/models (checked 2026-10).
 */
const PRICE_TABLE: Record<string, PriceEntry> = {
  "bedrock-claude-opus-sim": {
    inputPerMillion: 5.0,
    outputPerMillion: 25.0,
  },
  "bedrock-claude-sonnet-sim": {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  },
  "bedrock-claude-haiku-sim": {
    inputPerMillion: 0.8,
    outputPerMillion: 4.0,
  },
  "grok-4.7": xaiEntry(2.0, 0.5, 6.0),
  "grok-4.6": xaiEntry(2.0, 0.5, 6.0),
  "grok-4.5": xaiEntry(2.0, 0.3, 6.0),
  "grok-4.3": xaiEntry(1.25, 0.2, 2.5),
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
  options: { cachedInputTokens?: number } = {},
): CostResult {
  const entry = PRICE_TABLE[model];
  if (!entry) {
    return {
      cost: null,
      currency: "USD",
      costUnavailableReason: `No price entry for model "${model}" in table ${PRICING_TABLE_VERSION}`,
    };
  }

  const rates =
    entry.longContext && inputTokens >= entry.longContext.promptTokenThreshold
      ? entry.longContext
      : entry;
  const cached = Math.min(options.cachedInputTokens ?? 0, inputTokens);
  const cachedRate = rates.cachedInputPerMillion ?? rates.inputPerMillion;

  const cost =
    ((inputTokens - cached) / 1_000_000) * rates.inputPerMillion +
    (cached / 1_000_000) * cachedRate +
    (outputTokens / 1_000_000) * rates.outputPerMillion;

  return {
    cost: Number(cost.toFixed(8)),
    currency: "USD",
  };
}

export function listPricedModels(): string[] {
  return Object.keys(PRICE_TABLE);
}
