import { MockBadge } from "@/components/MockBadge";
import { PRICING_TABLE_VERSION } from "@/lib/gateway/pricing";

const SEAMS = [
  {
    name: "Gateway model adapter",
    status: "mock",
    current:
      "lib/gateway/mock-model.ts returns scripted answers with simulated tokens.",
    replaceWith: "Bedrock (or other) adapter behind executePrompt()",
  },
  {
    name: "Documents / retrieval",
    status: "mock",
    current:
      "Keyword matching over synthetic Markdown files + browser uploads. Labeled not NeMo.",
    replaceWith: "Managed document store + real retriever",
  },
  {
    name: "Authentication",
    status: "mock",
    current: "Role picker stored in localStorage (mock SSO).",
    replaceWith: "Enterprise SSO / IdP",
  },
];

export default function AboutDemoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="mb-2 flex gap-2">
          <MockBadge label="Demo disclosure" />
        </div>
        <h1 className="text-3xl font-semibold text-white">About this demo</h1>
        <p className="mt-3 text-sm leading-relaxed text-cyan-100/80">
          This application is a <strong>look-alike approximation</strong> of an
          internal GenAI workbench, inspired by public reporting about Nasdaq
          employees uploading documents, chatting for answers, and adopting AI
          for engineering, sales, support, data operations, and marketing drafts.
          It is <strong>not</strong> a Nasdaq product or system.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">What is simulated</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-cyan-100/80">
          <li>All model answers and workflow outputs (scripted)</li>
          <li>Retrieval scores and latency (not NVIDIA NeMo)</li>
          <li>Token counts and USD cost (pricing table {PRICING_TABLE_VERSION})</li>
          <li>SSO / roles (localStorage)</li>
          <li>Uploaded files (browser only)</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Demo-only requirement</h2>
        <p className="text-sm text-cyan-100/80">
          The observable GenAI gateway (HTTP <code className="text-cyan-200">/api/v1</code>,
          MCP tools, typed client, and cost traces) is a{" "}
          <strong>requirement of this demo repository</strong>, not a publicly
          reported feature of Nasdaq&apos;s internal platform. Every prompt in
          the UI still goes through that gateway so API / MCP / programmatic
          access stay aligned.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Integration seams</h2>
        <p className="text-sm text-cyan-100/70">
          Replacing a mock may still require UI tweaks; the seams reduce, but do
          not eliminate, change.
        </p>
        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0d2240] text-xs uppercase text-cyan-200/60">
              <tr>
                <th className="px-3 py-2">Component</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Current mock</th>
                <th className="px-3 py-2">Intended replacement</th>
              </tr>
            </thead>
            <tbody>
              {SEAMS.map((row) => (
                <tr key={row.name} className="border-t border-white/10">
                  <td className="px-3 py-3 font-medium text-white">{row.name}</td>
                  <td className="px-3 py-3">
                    <MockBadge label={row.status} />
                  </td>
                  <td className="px-3 py-3 text-cyan-100/80">{row.current}</td>
                  <td className="px-3 py-3 text-cyan-100/80">{row.replaceWith}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
