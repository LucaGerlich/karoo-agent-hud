import type { FastifyInstance } from "fastify";
import type { AgentStore } from "../store/agent-store.js";
import { validateToken } from "../auth/pairing.js";
import type { PairingState } from "../auth/pairing.js";

export function agentRoutes(app: FastifyInstance, store: AgentStore, pairing: PairingState) {
  app.addHook("onRequest", async (req, reply) => {
    if (!validateToken(pairing, req.headers.authorization)) {
      return reply.status(401).send({ error: "unauthorized" });
    }
  });

  app.get("/api/v1/agents", async () => {
    return {
      agents: store.list(),
      activeAgentId: store.getActiveAgentId(),
    };
  });

  app.get<{ Params: { id: string } }>("/api/v1/agents/:id/summary", async (req, reply) => {
    const summary = store.getSummary(req.params.id);
    if (!summary) {
      return reply.status(404).send({ error: "agent_not_found" });
    }
    return summary;
  });

  app.post<{ Params: { id: string }; Body: { action: string } }>(
    "/api/v1/agents/:id/action",
    async (req, reply) => {
      const agent = store.get(req.params.id);
      if (!agent) {
        return reply.status(404).send({ error: "agent_not_found" });
      }
      const { action } = req.body ?? {};
      if (!action || typeof action !== "string") {
        return reply.status(400).send({ error: "missing_action" });
      }
      // For MVP, just acknowledge. Future: queue actions for agent adapters.
      return { accepted: true, message: "Action queued" };
    },
  );

  app.post<{ Params: { id: string }; Body: { active: boolean } }>(
    "/api/v1/agents/:id/active",
    async (req, reply) => {
      const success = store.setActiveAgent(req.params.id);
      if (!success) {
        return reply.status(404).send({ error: "agent_not_found" });
      }
      return { activeAgentId: req.params.id };
    },
  );
}
