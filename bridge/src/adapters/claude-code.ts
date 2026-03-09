import type { AgentStore } from "../store/agent-store.js";
import type { AgentPhase } from "../store/types.js";
import { computeProgress, generateStatusLine, inferPhase } from "../utils/progress.js";

function agentId(sessionId: string): string {
  return `claude-${sessionId}`;
}

function extractProjectName(cwd: string | undefined): string {
  if (!cwd) return "unknown";
  return cwd.split("/").pop() ?? cwd;
}

export function handleSessionStart(
  store: AgentStore,
  body: Record<string, unknown>,
): void {
  const sessionId = String(body.session_id ?? "");
  if (!sessionId) return;

  const id = agentId(sessionId);
  const cwd = body.cwd as string | undefined;

  store.upsert(id, {
    id,
    name: "Claude Code",
    type: "claude-code",
    status: "working",
    phase: "starting",
    progress: 5,
    pendingQuestions: 0,
    statusLine: "Session started",
    sessionId,
    projectName: extractProjectName(cwd),
    startedAt: new Date().toISOString(),
    toolCallCount: 0,
    lastToolName: null,
    errorCount: 0,
    staleAfterMs: 60000,
  });
}

export function handlePostToolUse(
  store: AgentStore,
  body: Record<string, unknown>,
): void {
  const sessionId = String(body.session_id ?? "");
  if (!sessionId) return;

  const id = agentId(sessionId);
  const agent = store.get(id);
  if (!agent) {
    handleSessionStart(store, body);
    return;
  }

  const toolName = String(body.tool_name ?? "unknown");
  const toolInput = (body.tool_input as Record<string, unknown>) ?? {};
  const toolCallCount = agent.toolCallCount + 1;
  const phase = inferPhase(toolName, toolInput, agent.phase, toolCallCount);
  const progress = computeProgress(toolCallCount, phase);
  const statusLine = generateStatusLine(toolName, toolInput);

  store.upsert(id, {
    id,
    status: "working",
    phase,
    progress,
    toolCallCount,
    lastToolName: toolName,
    statusLine,
  });
}

export function handlePostToolUseFailure(
  store: AgentStore,
  body: Record<string, unknown>,
): void {
  const sessionId = String(body.session_id ?? "");
  if (!sessionId) return;

  const id = agentId(sessionId);
  const agent = store.get(id);
  if (!agent) return;

  store.upsert(id, {
    id,
    errorCount: agent.errorCount + 1,
    toolCallCount: agent.toolCallCount + 1,
    lastToolName: String(body.tool_name ?? agent.lastToolName),
    statusLine: `Error in ${body.tool_name ?? "tool"}`,
  });
}

export function handleNotification(
  store: AgentStore,
  body: Record<string, unknown>,
): void {
  const sessionId = String(body.session_id ?? "");
  if (!sessionId) return;

  const id = agentId(sessionId);
  const agent = store.get(id);
  if (!agent) return;

  store.upsert(id, {
    id,
    pendingQuestions: agent.pendingQuestions + 1,
    status: "waiting",
    statusLine: "Permission needed",
  });
}

export function handleStop(
  store: AgentStore,
  body: Record<string, unknown>,
): void {
  const sessionId = String(body.session_id ?? "");
  if (!sessionId) return;

  const id = agentId(sessionId);
  store.upsert(id, {
    id,
    status: "idle",
    phase: "reviewing",
    progress: 100,
    statusLine: "Completed",
  });
}

export function handleSessionEnd(
  store: AgentStore,
  body: Record<string, unknown>,
): void {
  const sessionId = String(body.session_id ?? "");
  if (!sessionId) return;

  const id = agentId(sessionId);
  store.upsert(id, {
    id,
    status: "stopped",
    statusLine: "Session ended",
  });
}
