"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createGatewayClient,
  type ModelAvailability,
} from "@/lib/gateway/client";
import { MODEL_CATALOG } from "@/lib/models";

export function ModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (model: string) => void;
}) {
  const client = useMemo(() => createGatewayClient(), []);
  const [models, setModels] = useState<ModelAvailability[]>(() =>
    MODEL_CATALOG.map((m) => ({ ...m, available: true })),
  );

  useEffect(() => {
    client
      .listModels()
      .then(setModels)
      .catch(() => {
        // keep the static catalog; the gateway reports per-request errors
      });
  }, [client]);

  return (
    <label className="flex items-center gap-2 text-xs text-cyan-200/70">
      Model
      <select
        aria-label="Model"
        className="rounded border border-white/15 bg-[#071628] px-2 py-1 text-sm text-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.providerModel ? `${m.label} · ${m.providerModel}` : m.label}
            {m.available ? "" : ` — ${m.unavailableReason ?? "unavailable"}`}
          </option>
        ))}
      </select>
    </label>
  );
}
