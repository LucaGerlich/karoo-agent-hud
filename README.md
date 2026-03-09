<div align="center">

# Agent HUD

**Monitor your AI coding agents on your Hammerhead Karoo 3 bike computer.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Kotlin](https://img.shields.io/badge/Kotlin-2.0-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org)
[![Karoo SDK](https://img.shields.io/badge/karoo--ext-1.1.3-orange)](https://github.com/hammerheadnav/karoo-ext)

While you ride, native Karoo data fields show real-time agent progress,
pending questions, and status -- no phone required.

<br>

```
 +--------------------------+   +--------------------------+   +--------------------------+
 |  WORKING                 |   |  WAITING                 |   |  OFFLINE                 |
 |                          |   |                          |   |                          |
 |  Claude Code        72%  |   |  Claude Code      ? x 2  |   |  Bridge Offline           |
 |  implementing             |   |  WAITING                  |   |  Last seen: 14:32         |
 |  Editing main.ts          |   |  Permission needed        |   |                          |
 +--------------------------+   +--------------------------+   +--------------------------+
```

[Getting Started](#getting-started) · [Documentation](docs/setup.md) · [API Reference](docs/api.md)

</div>

---

## How It Works

Claude Code hooks push lifecycle events to a local bridge server. The bridge tracks agent state (phase, progress, pending questions). Your Karoo extension polls the bridge over WiFi every 3 seconds and renders the data as native fields.

```
  Workstation                                              Karoo 3
+-----------------+     HTTP POST      +-----------+     HTTP GET      +---------------+
| Claude Code     |---- hooks -------->|  Bridge   |<---- poll (3s) ---| Karoo         |
| (agent session) |   curl, 5s max     |  Server   |                  | Extension     |
+-----------------+                    |  :7420    |                  |               |
                                       |           |                  | Data Fields:  |
+-----------------+     HTTP POST      | In-memory |                  |  progress %   |
| Future agents   |---- adapter ------>| agent     |                  |  questions #  |
| (Cursor, Aider) |                    | store     |                  |  status (gfx) |
+-----------------+                    +-----------+                  +---------------+
```

| Component | Stack | Role |
|-----------|-------|------|
| **Bridge Server** | Node.js, TypeScript, Fastify | Aggregates agent state, serves REST API |
| **Karoo Extension** | Kotlin, karoo-ext SDK, Jetpack Glance | Renders native data fields on Karoo 3 |
| **Agent Adapter** | Claude Code hooks, curl | Pushes lifecycle events to the bridge |

## Data Fields

| Field | Type | What it shows |
|-------|------|---------------|
| **Agent Progress** | Numeric | 0-100% completion based on tool calls and inferred phase |
| **Agent Questions** | Numeric | Count of pending permission prompts |
| **Agent Status** | Graphical | Agent name, phase, and status line. Amber when waiting, dimmed when offline |

## Getting Started

### 1. Start the Bridge

```bash
cd bridge
pnpm install
pnpm dev
```

The bridge prints a **6-digit pairing code** and listens on port `7420`.

### 2. Configure Claude Code

```bash
# Pair to get a bearer token
curl -X POST http://localhost:7420/api/v1/pair \
  -H 'Content-Type: application/json' \
  -d '{"pairingCode": "YOUR_CODE"}'

# Set the token in your shell profile
export AGENT_HUD_TOKEN="ahud_..."
```

Copy the hooks from [`hooks/claude-hooks.json`](hooks/claude-hooks.json) into your `~/.claude/settings.json`. See [hooks/README.md](hooks/README.md) for details.

### 3. Install on Karoo

```bash
cd karoo-app
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Open **Agent HUD** on the Karoo, enter the bridge URL and pairing code, then add the data fields to a ride profile.

> **Prerequisites:** Node.js 20+, pnpm, Android SDK, JDK 17+, GitHub token with `read:packages` scope for the [karoo-ext SDK](https://github.com/hammerheadnav/karoo-ext). See [docs/setup.md](docs/setup.md) for full details.

## Agent Lifecycle

The bridge infers your agent's phase from the tools it uses:

| Event | Status | Phase | Progress |
|-------|--------|-------|----------|
| Session starts | `working` | starting | 5% |
| Read / Glob / Grep | `working` | thinking | 10%+ |
| Edit / Write | `working` | implementing | 30%+ |
| Bash (test/lint) | `working` | testing | 70%+ |
| Permission prompt | `waiting` | -- | -- |
| Stop | `idle` | reviewing | 100% |
| Session ends | `stopped` | -- | -- |

Progress is a heuristic: `min(toolCallCount / 50 * 80, 80)` floored by phase minimums. See [docs/api.md](docs/api.md#progress-heuristic) for the formula.

## Multi-Agent Support

The bridge tracks any number of concurrent sessions. Each gets a unique ID (`claude-{sessionId}`) with the project name for disambiguation. Use the **Next Agent** bonus action on the Karoo to cycle between them.

## Bonus Actions

Available from the Karoo's in-ride menu:

| Action | What it does |
|--------|-------------|
| **Next Agent** | Cycle to the next active agent |
| **Approve** | Send approval action to the active agent |

## Project Structure

```
bridge/                      Node.js bridge server
  src/
    index.ts                 Entry point (port 7420)
    server.ts                Fastify app factory
    routes/                  health, pair, agents, hooks
    store/                   In-memory agent store
    adapters/                Claude Code event mapping
    auth/                    Pairing + token validation
    utils/                   Progress heuristic, phase inference
  test/                      25 vitest tests

karoo-app/                   Android Karoo extension
  app/src/main/
    kotlin/.../agenthud/
      extension/             KarooExtension entry point
      data/                  3 DataType implementations
      network/               BridgeClient + API models
      ui/                    Glance composable, config screen
    res/xml/                 extension_info.xml

hooks/                       Claude Code integration
  claude-hooks.json          Copy into ~/.claude/settings.json
```

## API Overview

Base URL: `http://<host>:7420/api/v1`

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /health` | No | Server status |
| `POST /pair` | No | Exchange pairing code for token |
| `GET /agents` | Yes | List all agents |
| `GET /agents/:id/summary` | Yes | Detailed agent state |
| `POST /agents/:id/action` | Yes | Send action to agent |
| `POST /agents/:id/active` | Yes | Set active agent |
| `POST /hooks/*` | Yes | 6 hook endpoints for lifecycle events |

Full reference: [docs/api.md](docs/api.md)

## Configuration

### Bridge Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `7420` | Listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `LOG_LEVEL` | `info` | `debug` / `info` / `warn` / `error` |

### Shell

| Variable | Description |
|----------|-------------|
| `AGENT_HUD_TOKEN` | Bearer token from `POST /pair` |

## Security

| Mechanism | Detail |
|-----------|--------|
| **Pairing** | Random 6-digit code generated at bridge startup |
| **Auth** | Bearer token (`ahud_...`) issued on successful pair |
| **Network** | LAN-only by default. Use Tailscale/VPN for remote access |
| **APK** | No secrets baked in -- token entered via config UI |

## Documentation

| Document | Description |
|----------|-------------|
| [**Setup Guide**](docs/setup.md) | Prerequisites, installation, configuration, troubleshooting |
| [**API Reference**](docs/api.md) | All REST endpoints with request/response examples |
| [**Hooks Setup**](hooks/README.md) | Claude Code hook configuration |

## Roadmap

- [ ] Improved graphical field (color-coded phases, progress bar, elapsed time)
- [ ] Bridge persistence with SQLite
- [ ] JSONL file watcher as fallback adapter
- [ ] GitHub Actions CI for APK builds
- [ ] WebSocket/SSE for lower-latency updates
- [ ] Adapters for Cursor, Aider, Codex CLI
- [ ] Bridge web dashboard
- [ ] HTTPS support

## License

[MIT](LICENSE)
