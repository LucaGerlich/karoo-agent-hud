# Claude Code Hooks Setup

## Quick Start

1. Start the bridge server: `cd bridge && pnpm dev`
2. Note the pairing code from the console output
3. Pair to get a token:
   ```bash
   curl -X POST http://localhost:7420/api/v1/pair \
     -H 'Content-Type: application/json' \
     -d '{"pairingCode": "YOUR_CODE"}'
   ```
4. Set the token as an environment variable:
   ```bash
   export AGENT_HUD_TOKEN="ahud_..."
   ```
5. Merge the hooks from `claude-hooks.json` into your `~/.claude/settings.json`

## Manual Setup

Add these hooks to the `"hooks"` key in `~/.claude/settings.json`. See `claude-hooks.json` for the full config.

The hooks use `curl` to POST Claude Code lifecycle events to the bridge server. Each hook:
- Reads event JSON from stdin via `$(cat)`
- Sends it to the bridge with the bearer token
- Uses `-sf` (silent, fail-fast) so Claude Code is never blocked
- Has a 5-second timeout

## Environment Variable

The `AGENT_HUD_TOKEN` environment variable must be set in your shell before starting Claude Code. Add it to your `.zshrc` / `.bashrc` or set it per-session.

## Custom Bridge URL

If your bridge runs on a different host/port, replace `http://localhost:7420` in each hook command.
