import { describe, expect, it, vi } from "vitest";
import { createGatewayClient } from "./client";

describe("gateway client listTraces", () => {
  it("sends role and workspaceId as query params", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ data: [], paging: { nextCursor: null, limit: 25 } }),
    );
    const client = createGatewayClient({ baseUrl: "http://gw.test", fetchImpl });

    await client.listTraces({ limit: 25, role: "engineer", workspaceId: "engineering" });

    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/v1/traces");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: "25",
      role: "engineer",
      workspaceId: "engineering",
    });
  });
});
