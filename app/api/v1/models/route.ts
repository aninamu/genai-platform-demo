import { getXaiConfig } from "@/lib/gateway";
import { MODEL_CATALOG } from "@/lib/models";

export const runtime = "nodejs";

export async function GET() {
  const xai = getXaiConfig();
  return Response.json({
    data: MODEL_CATALOG.map((m) =>
      m.provider === "xai"
        ? {
            ...m,
            providerModel: xai.model,
            available: Boolean(xai.apiKey),
            unavailableReason: xai.apiKey ? undefined : "XAI_API_KEY is not set",
          }
        : { ...m, available: true },
    ),
  });
}
