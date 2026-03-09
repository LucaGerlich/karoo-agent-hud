# Setup Guide

Complete installation and configuration guide for Agent HUD.

## Prerequisites

### Bridge Server
- Node.js 20+
- pnpm (`npm install -g pnpm`)

### Karoo Extension
- Android SDK (Android Studio or command-line tools)
- JDK 17+
- GitHub account with a personal access token (for the karoo-ext Maven package)

### Claude Code Integration
- Claude Code CLI installed
- `curl` available in your shell

## Bridge Server

### Install and Run

```bash
cd bridge
pnpm install
pnpm dev
```

On startup, the bridge prints:

```
  Agent HUD Bridge running on http://0.0.0.0:7420
  Pairing code: 742816
  Use POST /api/v1/pair with this code to get a bearer token
```

Note the **pairing code** -- you'll need it for both the Claude Code hooks and the Karoo extension.

### Get a Bearer Token

```bash
curl -X POST http://localhost:7420/api/v1/pair \
  -H 'Content-Type: application/json' \
  -d '{"pairingCode": "742816"}'
```

Response:

```json
{"token": "ahud_ZGPzbZ1fa07AIHnAe01Rkg", "bridgeName": "your-hostname"}
```

Save this token. You can generate multiple tokens by calling `/pair` again with the same code.

### Configuration

The bridge is configured via environment variables:

```bash
# Custom port
PORT=8080 pnpm dev

# Debug logging
LOG_LEVEL=debug pnpm dev

# Bind to localhost only
HOST=127.0.0.1 pnpm dev
```

### Production

```bash
pnpm build
PORT=7420 node dist/index.js
```

### Running Tests

```bash
pnpm test          # Single run
pnpm test:watch    # Watch mode
```

## Claude Code Hooks

### Step 1: Set the Token

Add to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):

```bash
export AGENT_HUD_TOKEN="ahud_your_token_here"
```

Reload your shell or run `source ~/.zshrc`.

### Step 2: Configure Hooks

Open `~/.claude/settings.json` and merge the hooks from [`hooks/claude-hooks.json`](../hooks/claude-hooks.json).

If you already have hooks configured, add the Agent HUD hooks alongside your existing ones. Each hook event (`SessionStart`, `PostToolUse`, etc.) accepts an array, so you can have multiple hooks per event.

Example merged config:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "curl -sf -X POST -H 'Content-Type: application/json' -H \"Authorization: Bearer $AGENT_HUD_TOKEN\" -d \"$(cat)\" http://localhost:7420/api/v1/hooks/session-start",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

See `hooks/claude-hooks.json` for the complete configuration with all 6 events.

### Step 3: Verify

Start a Claude Code session and check the bridge:

```bash
curl -s http://localhost:7420/api/v1/agents \
  -H "Authorization: Bearer $AGENT_HUD_TOKEN" | python3 -m json.tool
```

You should see your session listed with `status: "working"`.

### Hook Events

| Event | When it fires | What the bridge does |
|-------|--------------|---------------------|
| `SessionStart` | Claude Code session begins | Creates agent, sets `status=working` |
| `PostToolUse` | After each tool call | Increments tool count, infers phase, updates status line |
| `PostToolUseFailure` | Tool call fails | Increments error count |
| `Notification` | Permission prompt appears | Increments pending questions, sets `status=waiting` |
| `Stop` | Agent finishes | Sets `status=idle`, `progress=100` |
| `SessionEnd` | Session closes | Sets `status=stopped` |

### Custom Bridge URL

If the bridge runs on a different host or port, replace `http://localhost:7420` in each hook command.

### Troubleshooting

- **Hooks not firing**: Verify `AGENT_HUD_TOKEN` is set in your shell (`echo $AGENT_HUD_TOKEN`)
- **Connection refused**: Ensure the bridge is running (`curl http://localhost:7420/api/v1/health`)
- **401 Unauthorized**: The token may be expired or wrong. Re-pair with the bridge
- **Hooks are non-blocking**: If the bridge is down, Claude Code continues normally. Hooks use `curl -sf` (silent, fail-fast) with a 5-second timeout

## Karoo Extension

### Step 1: Configure GitHub Packages

The karoo-ext SDK is hosted on GitHub Package Registry. Add your credentials to `~/.gradle/gradle.properties`:

```properties
gpr.user=YOUR_GITHUB_USERNAME
gpr.key=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
```

The token needs the `read:packages` scope. Generate one at [GitHub Settings > Tokens](https://github.com/settings/tokens).

### Step 2: Add Gradle Wrapper

If the `karoo-app/` directory doesn't have `gradlew`, generate it:

```bash
cd karoo-app
gradle wrapper --gradle-version 8.6
```

Or copy the wrapper files from the [karoo-ext-template](https://github.com/hammerheadnav/karoo-ext-template).

### Step 3: Build

```bash
cd karoo-app
./gradlew assembleDebug
```

The APK is at `app/build/outputs/apk/debug/app-debug.apk`.

### Step 4: Install on Karoo 3

**Option A: Hammerhead Companion App**

1. Transfer the APK to your phone
2. Open the file and share it with the Hammerhead Companion App
3. The Companion App installs it on your connected Karoo

**Option B: ADB**

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Step 5: Configure on Karoo

1. Open the Agent HUD app on the Karoo
2. Enter the bridge URL (e.g., `http://192.168.1.100:7420`)
3. Enter the 6-digit pairing code from the bridge console
4. Tap **Pair**

### Step 6: Add Data Fields

1. Open your ride profile settings on the Karoo
2. Add a data field page
3. Select **Agent HUD** as the source
4. Choose from: Agent Progress, Agent Questions, or Agent Status

The **Agent Status** field is graphical and shows the most information (name, phase, status line).

### Debug Logging

```bash
adb logcat -s AgentHud
```

## Network Requirements

- The Karoo and the bridge must be on the same network (WiFi/LAN)
- The bridge binds to `0.0.0.0` by default, making it accessible from any device on the network
- Default poll interval is 3 seconds (configurable 2-10s in the Karoo app settings)
- Each poll transfers ~100-500 bytes -- negligible battery impact

### Firewall

Ensure port 7420 (or your custom port) is open for incoming TCP connections on the machine running the bridge.

### Remote Access

For riding outside your home network:

- **Phone hotspot**: Connect both your laptop and Karoo to your phone's hotspot
- **Tailscale/VPN**: The bridge and Karoo both join the same Tailscale network
- Update the bridge URL in the Karoo config to the new IP

## Release Build

```bash
cd karoo-app
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=keystore.jks \
  -Pandroid.injected.signing.store.password=$STORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=agenthud \
  -Pandroid.injected.signing.key.password=$KEY_PASSWORD
```

Generate a keystore if you don't have one:

```bash
keytool -genkey -v -keystore keystore.jks -alias agenthud \
  -keyalg RSA -keysize 2048 -validity 10000
```
