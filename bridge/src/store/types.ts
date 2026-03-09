export type AgentType = "claude-code" | "cursor" | "aider" | "generic";
export type AgentStatus = "idle" | "working" | "waiting" | "error" | "stopped";
export type AgentPhase = "starting" | "thinking" | "implementing" | "testing" | "reviewing";

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  phase: AgentPhase;
  progress: number;
  pendingQuestions: number;
  statusLine: string;
  sessionId: string;
  projectName: string;
  startedAt: string;
  lastUpdate: string;
  toolCallCount: number;
  lastToolName: string | null;
  errorCount: number;
  staleAfterMs: number;
}

export interface AgentSummary extends Agent {
  stale: boolean;
}

export interface AgentListItem {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  progress: number;
  pendingQuestions: number;
  lastUpdate: string;
  projectName: string;
}
