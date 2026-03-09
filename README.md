# Agent HUD

Monitor your AI coding agents at a glance on your Hammerhead Karoo 3 bike computer.

Agent HUD bridges the gap between your development workstation and your cycling computer. While you ride, native Karoo data fields show real-time agent progress, pending questions, and status -- no phone required.

## Architecture

```
  Workstation                                          Karoo 3
+-----------------+    HTTP POST     +-----------+    HTTP GET     +---------------+
| Claude Code     |--- hooks ------->|  Bridge   |<--- poll (3s) --| Karoo         |
| (agent session) |  (curl, 5s max)  |  Server   |                | Extension     |
+-----------------+                  | :7420     |                |               |
                                     |           |                | Data Fields:  |
+-----------------+    HTTP POST     | In-memory |                |  progress %   |
| Future agents   |--- adapter ----->| agent     |                |  questions #  |
| (Cursor, Aider) |                  | store     |                |  status (gfx) |
+-----------------+                  +-----------+                +---------------+
```

Three components:

| Component | Technology | Role |
|-----------|-----------|------|
| **Bridge Server** | Node.js, TypeScript, Fastify | Aggregates agent state, serves REST API |
| **Karoo Extension** | Kotlin, karoo-ext SDK, Jetpack Glance | Renders data fields on Karoo 3 |
| **Agent Adapters** | Claude Code hooks (curl) | Push lifecycle events to bridge |

## Quick Start

### 1. Start the Bridge Server

```bash
cd bridge
pnpm install
pnpm dev
```

The bridge prints a 6-digit pairing code and listens on port 7420.

### 2. Configure Claude Code Hooks

```bash
# Get a bearer token
curl -X POST http://localhost:7420/api/v1/pair \
  -H 'Content-Type: application/json' \
  -d '{"pairingCode": "YOUR_CODE"}'

# Set the token
export AGENT_HUD_TOKEN="ahud_..."
```

Merge the hooks from [`hooks/claude-hooks.json`](hooks/claude-hooks.json) into your `~/.claude/settings.json`. See [hooks/README.md](hooks/README.md) for details.

### 3. Install the Karoo Extension

```bash
cd karoo-app
./gradlew assembleDebug
```

Sideload the APK to your Karoo 3 via the Hammerhead Companion App or ADB:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Open Agent HUD on the Karoo, enter the bridge URL and pairing code, then add the data fields to a ride profile.

## Data Fields

| Field | Type | Description |
|-------|------|-------------|
| **Agent Progress** | Numeric | Completion percentage (0-100), based on tool call count and phase |
| **Agent Questions** | Numeric | Number of pending permission prompts |
| **Agent Status** | Graphical | Name, phase, status line with color-coded waiting state |

### Graphical Field States

**Working** -- white text, transparent background:
```
Claude Code         72%
implementing
Editing main.ts
```

**Waiting** -- white text, amber background:
```
Claude Code      ? x 2
WAITING
Permission needed
```

**Offline** -- gray text:
```
Bridge Offline
```

## Bonus Actions

Available from the Karoo's Bonus Actions menu during a ride:

- **Next Agent** -- cycles the active agent when multiple sessions are running
- **Approve** -- sends an approval action to the bridge for the active agent

## Project Structure

```
hammerhead-agent-extention/
  bridge/              # Node.js bridge server
    src/
      index.ts         # Entry point
      server.ts        # Fastify app factory
      routes/          # health, pair, agents, hooks
      store/           # In-memory agent store + types
      adapters/        # Claude Code event mapping
      auth/            # Pairing + token validation
      utils/           # Progress heuristic, phase inference
    test/              # Vitest tests (25 tests)
  karoo-app/           # Android Karoo extension
    app/src/main/
      kotlin/.../agenthud/
        extension/     # KarooExtension entry point
        data/          # DataType implementations
        network/       # BridgeClient, API models
        ui/            # Glance composable, config screen
      res/xml/         # extension_info.xml
  hooks/               # Claude Code hooks config
    claude-hooks.json  # Copy into ~/.claude/settings.json
    README.md          # Setup instructions
  docs/
    setup.md           # Detailed setup guide
    api.md             # REST API reference
```

## Documentation

- **[Setup Guide](docs/setup.md)** -- prerequisites, installation, configuration
- **[API Reference](docs/api.md)** -- all REST endpoints with examples
- **[Hooks Setup](hooks/README.md)** -- Claude Code integration

## How It Works

1. Claude Code hooks fire on lifecycle events (session start, tool use, notifications, stop)
2. Each hook runs `curl` to POST the event JSON to the bridge server
3. The bridge maintains an in-memory store of all active agents
4. The bridge infers the agent's phase (thinking, implementing, testing, reviewing) from tool names
5. Progress is estimated as a heuristic: `min(toolCallCount / 50 * 80, 80)` floored by phase minimums
6. The Karoo extension polls `GET /agents` and `GET /agents/:id/summary` every 3 seconds over WiFi
7. Data fields update via Kotlin coroutine flows bound to the polling state

## Environment Variables

### Bridge Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7420` | Server listen port |
| `HOST` | `0.0.0.0` | Server bind address |
| `LOG_LEVEL` | `info` | Pino log level (`debug`, `info`, `warn`, `error`) |

### Claude Code

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_HUD_TOKEN` | Yes | Bearer token from `POST /pair` |

## Multi-Agent Support

The bridge tracks any number of concurrent agent sessions. Each Claude Code session gets a unique ID (`claude-{sessionId}`). The Karoo shows the "active" agent and you can cycle between them with the **Next Agent** bonus action. The agents list endpoint returns all agents with their project names for disambiguation.

## Security

- **Pairing code**: random 6-digit code generated at bridge startup
- **Bearer token**: 24-character random token (`ahud_...`) issued on successful pairing
- **LAN-only**: designed for local network use (MVP)
- **No secrets in APK**: token is entered by the user via the config activity

For remote access, use a VPN or Tailscale. HTTPS support is planned for v2.

## License

MIT
