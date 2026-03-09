# API Reference

Base URL: `http://<bridge-host>:7420/api/v1`

## Authentication

All endpoints except `/health` and `/pair` require a bearer token in the `Authorization` header:

```
Authorization: Bearer ahud_your_token_here
```

Tokens are obtained via the `/pair` endpoint.

Unauthorized requests return:

```json
// 401
{ "error": "unauthorized" }
```

---

## Public Endpoints

### GET /health

Returns server status. No authentication required.

**Response 200:**

```json
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600,
  "agentCount": 2
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Always `"ok"` |
| `version` | string | Bridge server version |
| `uptime` | number | Seconds since server start |
| `agentCount` | number | Number of tracked agents |

---

### POST /pair

Exchange a pairing code for a bearer token.

**Request:**

```json
{ "pairingCode": "742816" }
```

**Response 200:**

```json
{
  "token": "ahud_ZGPzbZ1fa07AIHnAe01Rkg",
  "bridgeName": "luca-macbook"
}
```

**Response 400:**

```json
{ "error": "missing_pairing_code" }
```

**Response 401:**

```json
{ "error": "invalid_pairing_code" }
```

The pairing code is printed to the console when the bridge starts. You can generate multiple tokens using the same code.

---

## Agent Endpoints

All agent endpoints require authentication.

### GET /agents

List all tracked agents.

**Response 200:**

```json
{
  "agents": [
    {
      "id": "claude-abc123",
      "name": "Claude Code",
      "type": "claude-code",
      "status": "working",
      "progress": 65,
      "pendingQuestions": 0,
      "lastUpdate": "2026-03-06T14:32:10.000Z",
      "projectName": "my-project"
    }
  ],
  "activeAgentId": "claude-abc123"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `agents` | array | List of agent summaries |
| `activeAgentId` | string \| null | ID of the currently active agent |

**Agent list item fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique agent ID (`claude-{sessionId}`) |
| `name` | string | Display name (e.g., `"Claude Code"`) |
| `type` | string | `"claude-code"`, `"cursor"`, `"aider"`, or `"generic"` |
| `status` | string | `"idle"`, `"working"`, `"waiting"`, `"error"`, or `"stopped"` |
| `progress` | number | 0-100 completion estimate |
| `pendingQuestions` | number | Pending permission prompts |
| `lastUpdate` | string | ISO 8601 timestamp of last state change |
| `projectName` | string | Working directory name |

---

### GET /agents/:id/summary

Get detailed information about a specific agent.

**Response 200:**

```json
{
  "id": "claude-abc123",
  "name": "Claude Code",
  "type": "claude-code",
  "status": "working",
  "phase": "implementing",
  "progress": 65,
  "pendingQuestions": 0,
  "statusLine": "Editing main.ts",
  "sessionId": "abc123",
  "projectName": "my-project",
  "startedAt": "2026-03-06T14:00:00.000Z",
  "lastUpdate": "2026-03-06T14:32:10.000Z",
  "toolCallCount": 42,
  "lastToolName": "Edit",
  "errorCount": 1,
  "staleAfterMs": 60000,
  "stale": false
}
```

**Additional fields beyond the list item:**

| Field | Type | Description |
|-------|------|-------------|
| `phase` | string | `"starting"`, `"thinking"`, `"implementing"`, `"testing"`, or `"reviewing"` |
| `statusLine` | string | Human-readable status (max 40 chars) |
| `sessionId` | string | Claude Code session ID |
| `startedAt` | string | ISO 8601 session start time |
| `toolCallCount` | number | Total tool calls in this session |
| `lastToolName` | string \| null | Name of the last tool used |
| `errorCount` | number | Number of failed tool calls |
| `staleAfterMs` | number | Milliseconds before agent is marked stale (default 60000) |
| `stale` | boolean | True if no updates received within `staleAfterMs` |

**Response 404:**

```json
{ "error": "agent_not_found" }
```

---

### POST /agents/:id/action

Send an action to an agent (e.g., approve a pending question).

**Request:**

```json
{ "action": "approve" }
```

**Response 200:**

```json
{ "accepted": true, "message": "Action queued" }
```

**Response 400:**

```json
{ "error": "missing_action" }
```

**Response 404:**

```json
{ "error": "agent_not_found" }
```

Currently, actions are acknowledged but not forwarded to the agent. This is a placeholder for future bidirectional communication.

---

### POST /agents/:id/active

Set an agent as the active (displayed) agent.

**Request:**

```json
{ "active": true }
```

**Response 200:**

```json
{ "activeAgentId": "claude-abc123" }
```

**Response 404:**

```json
{ "error": "agent_not_found" }
```

---

## Hook Endpoints

Hook endpoints receive Claude Code lifecycle events. They use the same bearer token authentication as agent endpoints.

All hook endpoints return `{ "ok": true }` on success.

### POST /hooks/session-start

Called when a Claude Code session begins.

**Expected input (from Claude Code `SessionStart` hook):**

```json
{
  "session_id": "abc123",
  "cwd": "/home/user/my-project"
}
```

**Effect:** Creates a new agent with `status=working`, `phase=starting`, `progress=5`. The agent ID is `claude-{session_id}`. The project name is extracted from the last segment of `cwd`.

---

### POST /hooks/post-tool-use

Called after each successful tool call.

**Expected input (from Claude Code `PostToolUse` hook):**

```json
{
  "session_id": "abc123",
  "tool_name": "Edit",
  "tool_input": {
    "file_path": "/src/main.ts"
  }
}
```

**Effect:**
- Increments `toolCallCount`
- Updates `lastToolName`
- Infers the agent's phase from the tool name
- Recalculates progress
- Generates a human-readable status line
- Sets `status=working`

If the agent doesn't exist yet (session-start was missed), it is created automatically.

**Phase inference rules:**

| Tool | Inferred Phase |
|------|---------------|
| Edit, Write, NotebookEdit | `implementing` |
| Bash (with test/lint/check in command) | `testing` |
| Read, Glob, Grep, Search, WebSearch, WebFetch, Agent | `thinking` (if early in session) |
| Other | No change |

**Status line examples:**

| Tool | Status Line |
|------|------------|
| Edit (`file_path: "/src/main.ts"`) | `Editing main.ts` |
| Read (`file_path: "/src/index.ts"`) | `Reading index.ts` |
| Bash (`command: "pnpm test"`) | `Running: pnpm test` |
| Glob (`pattern: "**/*.ts"`) | `Searching **/*.ts` |
| Agent (`description: "explore code"`) | `Agent: explore code` |

---

### POST /hooks/post-tool-use-failure

Called when a tool call fails.

**Expected input:**

```json
{
  "session_id": "abc123",
  "tool_name": "Bash"
}
```

**Effect:** Increments `errorCount` and `toolCallCount`. Updates the status line to `Error in {tool_name}`.

---

### POST /hooks/notification

Called when a notification occurs (typically a permission prompt).

**Expected input:**

```json
{
  "session_id": "abc123"
}
```

**Effect:** Increments `pendingQuestions` and sets `status=waiting`. The status line changes to `Permission needed`.

---

### POST /hooks/stop

Called when the agent finishes its current task.

**Expected input:**

```json
{
  "session_id": "abc123"
}
```

**Effect:** Sets `status=idle`, `phase=reviewing`, `progress=100`. Status line changes to `Completed`.

---

### POST /hooks/session-end

Called when the Claude Code session closes.

**Expected input:**

```json
{
  "session_id": "abc123"
}
```

**Effect:** Sets `status=stopped`. Status line changes to `Session ended`.

---

## Data Model

### Agent Status Values

| Status | Meaning |
|--------|---------|
| `idle` | Agent finished its task |
| `working` | Agent is actively running |
| `waiting` | Agent is blocked on a permission prompt |
| `error` | Agent encountered an error |
| `stopped` | Session has ended |

### Agent Phase Values

| Phase | Meaning | Progress Floor |
|-------|---------|---------------|
| `starting` | Session just began | 5% |
| `thinking` | Reading/searching code | 10% |
| `implementing` | Writing/editing files | 30% |
| `testing` | Running tests or lints | 70% |
| `reviewing` | Task complete, reviewing | 85% |

### Progress Heuristic

Progress is computed as:

```
toolBased = min(floor(toolCallCount / 50 * 80), 80)
progress  = max(toolBased, phaseMinimum)
```

This gives a rough estimate that increases with tool calls and jumps to phase minimums during transitions. It caps at 80% from tool count alone -- reaching 85%+ requires entering the `testing` or `reviewing` phase. The `stop` event sets progress to 100%.

### Staleness

An agent is marked `stale: true` when `Date.now() - lastUpdate > staleAfterMs` (default 60 seconds). The Karoo extension can use this to dim the display, indicating the agent may have disconnected without a proper session-end event.
