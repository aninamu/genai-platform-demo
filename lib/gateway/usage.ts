import type {
  GatewayTrace,
  ModelUsage,
  UsageSource,
  UsageSummary,
} from "./contracts";
import { listAllTraces } from "./trace-store";

export function summarizeUsage(
  traces: GatewayTrace[],
  source: UsageSource = "all",
): UsageSummary {
  const selected = traces.filter((t) =>
    source === "all" ? true : source === "sample" ? t.sample : !t.sample,
  );

  const groups = new Map<string, GatewayTrace[]>();
  for (const t of selected) {
    const list = groups.get(t.model) ?? [];
    list.push(t);
    groups.set(t.model, list);
  }

  const total = selected.length;
  const byModel: ModelUsage[] = [...groups.entries()].map(([model, list]) => {
    const priced = list.filter((t) => t.cost !== null);
    const totalCost = priced.reduce((sum, t) => sum + (t.cost ?? 0), 0);
    return {
      model,
      requests: list.length,
      share: total ? list.length / total : 0,
      errors: list.filter((t) => t.status === "error").length,
      totalTokens: list.reduce((sum, t) => sum + t.totalTokens, 0),
      totalCost: Number(totalCost.toFixed(6)),
      avgCostPerRequest: priced.length
        ? Number((totalCost / priced.length).toFixed(8))
        : null,
      unpricedRequests: list.length - priced.length,
      avgLatencyMs: Math.round(
        list.reduce((sum, t) => sum + t.latencyMs, 0) / list.length,
      ),
    };
  });
  byModel.sort((a, b) => b.requests - a.requests);

  return {
    source,
    totalRequests: total,
    totalCost: Number(
      byModel.reduce((sum, m) => sum + m.totalCost, 0).toFixed(6),
    ),
    sampleRequests: selected.filter((t) => t.sample).length,
    byModel,
  };
}

export function getUsageSummary(source: UsageSource = "all"): UsageSummary {
  return summarizeUsage(listAllTraces(), source);
}
