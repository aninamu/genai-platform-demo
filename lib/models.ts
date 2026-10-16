export type ModelProvider = "bedrock-sim" | "xai";

export interface ModelOption {
  id: string;
  label: string;
  provider: ModelProvider;
  simulated: boolean;
}

export const GROK_MODEL_ID = "xai-grok";
export const DEFAULT_MODEL_ID = GROK_MODEL_ID;
export const DEFAULT_XAI_MODEL = "grok-4.7";
/** Dominant model in seeded sample traffic history (not the picker default). */
export const SAMPLE_TRAFFIC_DEFAULT_MODEL_ID = "bedrock-claude-opus-sim";

export const MODEL_CATALOG: ModelOption[] = [
  {
    id: GROK_MODEL_ID,
    label: "Grok (xAI API, live)",
    provider: "xai",
    simulated: false,
  },
  {
    id: SAMPLE_TRAFFIC_DEFAULT_MODEL_ID,
    label: "Claude Opus (Bedrock, simulated)",
    provider: "bedrock-sim",
    simulated: true,
  },
  {
    id: "bedrock-claude-sonnet-sim",
    label: "Claude Sonnet (Bedrock, simulated)",
    provider: "bedrock-sim",
    simulated: true,
  },
  {
    id: "bedrock-claude-haiku-sim",
    label: "Claude Haiku (Bedrock, simulated)",
    provider: "bedrock-sim",
    simulated: true,
  },
];

export function getModelOption(id: string): ModelOption | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function isLiveModel(id: string): boolean {
  return getModelOption(id)?.simulated === false;
}
