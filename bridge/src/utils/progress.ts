import type { AgentPhase } from "../store/types.js";

const PHASE_MINIMUMS: Record<AgentPhase, number> = {
  starting: 5,
  thinking: 10,
  implementing: 30,
  testing: 70,
  reviewing: 85,
};

export function computeProgress(toolCallCount: number, phase: AgentPhase): number {
  const toolBased = Math.min(Math.floor((toolCallCount / 50) * 80), 80);
  const phaseMin = PHASE_MINIMUMS[phase];
  return Math.max(toolBased, phaseMin);
}

const THINKING_TOOLS = new Set(["Read", "Glob", "Grep", "Search", "WebSearch", "WebFetch", "Agent"]);
const IMPLEMENTING_TOOLS = new Set(["Edit", "Write", "NotebookEdit"]);
const TESTING_TOOLS_PATTERNS = ["test", "lint", "check", "vitest", "jest", "pytest", "cargo test"];

export function inferPhase(
  toolName: string,
  toolInput: Record<string, unknown> | undefined,
  currentPhase: AgentPhase,
  toolCallCount: number,
): AgentPhase {
  if (IMPLEMENTING_TOOLS.has(toolName)) {
    return "implementing";
  }

  if (toolName === "Bash") {
    const command = String(toolInput?.command ?? "");
    const isTest = TESTING_TOOLS_PATTERNS.some((p) => command.includes(p));
    if (isTest) return "testing";
  }

  if (THINKING_TOOLS.has(toolName)) {
    if (toolCallCount <= 5 && currentPhase === "starting") return "thinking";
    if (currentPhase === "starting") return "thinking";
  }

  return currentPhase;
}

export function generateStatusLine(toolName: string, toolInput: Record<string, unknown> | undefined): string {
  const maxLen = 40;

  if (toolName === "Edit" || toolName === "Write" || toolName === "Read") {
    const filePath = String(toolInput?.file_path ?? toolInput?.path ?? "");
    const fileName = filePath.split("/").pop() ?? filePath;
    const verb = toolName === "Read" ? "Reading" : "Editing";
    return truncate(`${verb} ${fileName}`, maxLen);
  }

  if (toolName === "Bash") {
    const cmd = String(toolInput?.command ?? "").split("\n")[0];
    return truncate(`Running: ${cmd}`, maxLen);
  }

  if (toolName === "Glob" || toolName === "Grep") {
    const pattern = String(toolInput?.pattern ?? "");
    return truncate(`Searching ${pattern}`, maxLen);
  }

  if (toolName === "Agent") {
    const desc = String(toolInput?.description ?? "subagent");
    return truncate(`Agent: ${desc}`, maxLen);
  }

  return truncate(`Using ${toolName}`, maxLen);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}
