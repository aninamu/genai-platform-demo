import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAgents, getSeedDocuments } from "./seed";

describe("agent data integrity", () => {
  it("defines the four Nasdaq demo agents", () => {
    const ids = getAgents().map((a) => a.id);
    expect(ids).toEqual([
      "capital-access",
      "meeting-prep",
      "corporate-action",
      "mobile-research",
    ]);
  });

  it("every agent has a skill file, caller, and scripted steps", () => {
    for (const agent of getAgents()) {
      expect(agent.caller).toMatch(/^bdk:/);
      expect(agent.steps.length).toBeGreaterThanOrEqual(1);
      expect(fs.existsSync(path.join(process.cwd(), agent.skillPath))).toBe(
        true,
      );

      for (const step of agent.steps) {
        expect(step.output.trim().length).toBeGreaterThan(20);
        expect(step.citationIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("citation ids resolve to seed documents", () => {
    const docs = new Set(getSeedDocuments().map((d) => d.id));
    for (const agent of getAgents()) {
      for (const step of agent.steps) {
        for (const id of step.citationIds) {
          expect(docs.has(id)).toBe(true);
        }
      }
    }
  });

  it("Grok-differentiator steps include an X-context variant", () => {
    const meeting = getAgents().find((a) => a.id === "meeting-prep");
    const mobile = getAgents().find((a) => a.id === "mobile-research");
    expect(meeting?.steps[0].outputWithX).toMatch(/X context/i);
    expect(mobile?.steps[0].outputWithX).toMatch(/X \(Grok\)|X context/i);
    expect(meeting?.steps[0].output).not.toMatch(/### X context \(Grok\)/);
  });
});
