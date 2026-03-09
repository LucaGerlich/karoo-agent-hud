import type { FastifyInstance } from "fastify";
import type { AgentStore } from "../store/agent-store.js";

export function healthRoutes(app: FastifyInstance, store: AgentStore, startTime: number) {
  app.get("/api/v1/health", async () => {
    return {
      status: "ok",
      version: "0.1.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      agentCount: store.size,
    };
  });
}
