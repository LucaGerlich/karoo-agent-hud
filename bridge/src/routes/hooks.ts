import type { FastifyInstance } from "fastify";
import type { AgentStore } from "../store/agent-store.js";
import { validateToken } from "../auth/pairing.js";
import type { PairingState } from "../auth/pairing.js";
import {
  handleSessionStart,
  handlePostToolUse,
  handlePostToolUseFailure,
  handleNotification,
  handleStop,
  handleSessionEnd,
} from "../adapters/claude-code.js";

export function hookRoutes(app: FastifyInstance, store: AgentStore, pairing: PairingState) {
  app.addHook("onRequest", async (req, reply) => {
    if (!validateToken(pairing, req.headers.authorization)) {
      return reply.status(401).send({ error: "unauthorized" });
    }
  });

  app.post("/api/v1/hooks/session-start", async (req) => {
    handleSessionStart(store, req.body as Record<string, unknown>);
    return { ok: true };
  });

  app.post("/api/v1/hooks/post-tool-use", async (req) => {
    handlePostToolUse(store, req.body as Record<string, unknown>);
    return { ok: true };
  });

  app.post("/api/v1/hooks/post-tool-use-failure", async (req) => {
    handlePostToolUseFailure(store, req.body as Record<string, unknown>);
    return { ok: true };
  });

  app.post("/api/v1/hooks/notification", async (req) => {
    handleNotification(store, req.body as Record<string, unknown>);
    return { ok: true };
  });

  app.post("/api/v1/hooks/stop", async (req) => {
    handleStop(store, req.body as Record<string, unknown>);
    return { ok: true };
  });

  app.post("/api/v1/hooks/session-end", async (req) => {
    handleSessionEnd(store, req.body as Record<string, unknown>);
    return { ok: true };
  });
}
