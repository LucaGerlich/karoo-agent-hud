import type { FastifyInstance } from "fastify";
import { attemptPair, type PairingState } from "../auth/pairing.js";
import { hostname } from "node:os";

export function pairRoutes(app: FastifyInstance, pairing: PairingState) {
  app.post<{ Body: { pairingCode: string } }>("/api/v1/pair", async (req, reply) => {
    const { pairingCode } = req.body ?? {};
    if (!pairingCode || typeof pairingCode !== "string") {
      return reply.status(400).send({ error: "missing_pairing_code" });
    }

    const token = attemptPair(pairing, pairingCode);
    if (!token) {
      return reply.status(401).send({ error: "invalid_pairing_code" });
    }

    return { token, bridgeName: hostname() };
  });
}
