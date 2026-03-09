import { describe, it, expect, beforeEach } from "vitest";
import { buildServer, type BridgeApp } from "../src/server.js";
import { attemptPair } from "../src/auth/pairing.js";

describe("Routes", () => {
  let bridge: BridgeApp;
  let token: string;

  beforeEach(async () => {
    bridge = buildServer();
    await bridge.app.ready();
    token = attemptPair(bridge.pairing, bridge.pairing.pairingCode)!;
  });

  describe("GET /api/v1/health", () => {
    it("returns ok without auth", async () => {
      const res = await bridge.app.inject({ method: "GET", url: "/api/v1/health" });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe("ok");
      expect(body.version).toBe("0.1.0");
      expect(typeof body.agentCount).toBe("number");
    });
  });

  describe("POST /api/v1/pair", () => {
    it("returns token with correct code", async () => {
      const res = await bridge.app.inject({
        method: "POST",
        url: "/api/v1/pair",
        payload: { pairingCode: bridge.pairing.pairingCode },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().token).toMatch(/^ahud_/);
    });

    it("rejects wrong code", async () => {
      const res = await bridge.app.inject({
        method: "POST",
        url: "/api/v1/pair",
        payload: { pairingCode: "000000" },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("Authenticated routes", () => {
    it("rejects request without token", async () => {
      const res = await bridge.app.inject({ method: "GET", url: "/api/v1/agents" });
      expect(res.statusCode).toBe(401);
    });

    it("GET /agents returns empty list", async () => {
      const res = await bridge.app.inject({
        method: "GET",
        url: "/api/v1/agents",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().agents).toEqual([]);
    });

    it("full lifecycle: hook -> agents -> summary", async () => {
      const headers = { authorization: `Bearer ${token}` };

      // Session start
      await bridge.app.inject({
        method: "POST",
        url: "/api/v1/hooks/session-start",
        headers,
        payload: { session_id: "test1", cwd: "/home/user/cool-project" },
      });

      // Tool use
      await bridge.app.inject({
        method: "POST",
        url: "/api/v1/hooks/post-tool-use",
        headers,
        payload: { session_id: "test1", tool_name: "Edit", tool_input: { file_path: "/src/app.ts" } },
      });

      // List agents
      const listRes = await bridge.app.inject({ method: "GET", url: "/api/v1/agents", headers });
      const list = listRes.json();
      expect(list.agents).toHaveLength(1);
      expect(list.agents[0].status).toBe("working");
      expect(list.activeAgentId).toBe("claude-test1");

      // Summary
      const summaryRes = await bridge.app.inject({
        method: "GET",
        url: "/api/v1/agents/claude-test1/summary",
        headers,
      });
      const summary = summaryRes.json();
      expect(summary.phase).toBe("implementing");
      expect(summary.lastToolName).toBe("Edit");
      expect(summary.projectName).toBe("cool-project");
    });

    it("POST /agents/:id/action returns accepted", async () => {
      const headers = { authorization: `Bearer ${token}` };
      await bridge.app.inject({
        method: "POST",
        url: "/api/v1/hooks/session-start",
        headers,
        payload: { session_id: "act1" },
      });

      const res = await bridge.app.inject({
        method: "POST",
        url: "/api/v1/agents/claude-act1/action",
        headers,
        payload: { action: "approve" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().accepted).toBe(true);
    });

    it("POST /agents/:id/active sets active agent", async () => {
      const headers = { authorization: `Bearer ${token}` };
      await bridge.app.inject({
        method: "POST",
        url: "/api/v1/hooks/session-start",
        headers,
        payload: { session_id: "a1" },
      });
      await bridge.app.inject({
        method: "POST",
        url: "/api/v1/hooks/session-start",
        headers,
        payload: { session_id: "a2" },
      });

      const res = await bridge.app.inject({
        method: "POST",
        url: "/api/v1/agents/claude-a2/active",
        headers,
        payload: { active: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().activeAgentId).toBe("claude-a2");
    });
  });
});
