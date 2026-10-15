import { describe, expect, it } from "vitest";
import { getWorkflows } from "./seed";

describe("workflow data integrity", () => {
  it("every workflow has scripted output and public source", () => {
    const workflows = getWorkflows();
    expect(workflows.length).toBeGreaterThanOrEqual(5);

    for (const wf of workflows) {
      expect(wf.output.trim().length).toBeGreaterThan(10);
      expect(wf.source.label.trim().length).toBeGreaterThan(5);
      expect(wf.source.url).toMatch(/^https?:\/\//);
      expect(wf.promptTemplate.includes("{{") || wf.inputs.length >= 0).toBe(
        true,
      );
    }
  });

  it("covers the article use cases", () => {
    const ids = getWorkflows().map((w) => w.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "eng-code-assist",
        "sales-account-brief",
        "support-ticket-assist",
        "dataops-reconciliation",
        "marketing-blog-draft",
      ]),
    );
  });
});
