import { buildServer } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "7420", 10);
const HOST = process.env.HOST ?? "0.0.0.0";

const { app, pairing } = buildServer();

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n  Agent HUD Bridge running on http://${HOST}:${PORT}`);
  console.log(`  Pairing code: ${pairing.pairingCode}`);
  console.log(`  Use POST /api/v1/pair with this code to get a bearer token\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
