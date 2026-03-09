import Fastify from "fastify";
import { AgentStore } from "./store/agent-store.js";
import { createPairingState, type PairingState } from "./auth/pairing.js";
import { healthRoutes } from "./routes/health.js";
import { pairRoutes } from "./routes/pair.js";
import { agentRoutes } from "./routes/agents.js";
import { hookRoutes } from "./routes/hooks.js";

export interface BridgeApp {
  app: ReturnType<typeof Fastify>;
  store: AgentStore;
  pairing: PairingState;
}

export function buildServer(): BridgeApp {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV !== "test"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } }
          : undefined,
    },
  });

  const store = new AgentStore();
  const pairing = createPairingState();
  const startTime = Date.now();

  healthRoutes(app, store, startTime);
  pairRoutes(app, pairing);

  app.register(async (scoped) => {
    agentRoutes(scoped, store, pairing);
  });

  app.register(async (scoped) => {
    hookRoutes(scoped, store, pairing);
  });

  return { app, store, pairing };
}
