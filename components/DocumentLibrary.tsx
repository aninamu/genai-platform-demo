"use client";

import { MockBadge } from "./MockBadge";
import type { SeedDocument, UploadedDocument, WorkspaceId } from "@/lib/types";

export function DocumentLibrary({
  workspaceId,
  seedDocs,
  uploads,
  onUpload,
}: {
  workspaceId: WorkspaceId;
  seedDocs: SeedDocument[];
  uploads: UploadedDocument[];
  onUpload: (doc: UploadedDocument) => void;
}) {
  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".md") && !lower.endsWith(".txt")) {
        alert("Only .txt and .md files are accepted in this demo.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onUpload({
          id: `upload-${Date.now()}-${file.name}`,
          workspaceId,
          name: file.name,
          content: String(reader.result ?? ""),
          uploadedAt: new Date().toISOString(),
        });
      };
      reader.readAsText(file);
    });
  }

  return (
    <aside className="flex h-full flex-col rounded-lg border border-white/10 bg-[#0d2240]">
      <div className="border-b border-white/10 px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white">Documents</h2>
          <MockBadge label="Synthetic + local" />
        </div>
        <p className="mt-1 text-[11px] text-cyan-200/60">
          Stored in this browser for the demo
        </p>
      </div>

      <div className="border-b border-white/10 px-3 py-2">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded border border-dashed border-cyan-500/40 bg-[#071628] px-3 py-4 text-center text-xs text-cyan-100/80 hover:border-cyan-400">
          <span>Drop .txt / .md or click to upload</span>
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      <ul className="flex-1 space-y-2 overflow-auto p-3 text-sm">
        {uploads.map((doc) => (
          <li
            key={doc.id}
            className="rounded border border-cyan-500/20 bg-[#071628] px-2 py-2"
          >
            <div className="font-medium text-cyan-50">{doc.name}</div>
            <div className="text-[11px] text-cyan-200/50">Uploaded (browser)</div>
          </li>
        ))}
        {seedDocs.map((doc) => (
          <li
            key={doc.id}
            className="rounded border border-white/10 bg-[#071628] px-2 py-2"
          >
            <div className="font-medium text-cyan-50">{doc.title.replace(/^Synthetic sample document — /, "")}</div>
            <div className="text-[11px] text-amber-200/70">Synthetic sample document</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
