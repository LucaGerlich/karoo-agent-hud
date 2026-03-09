import type { Agent, AgentListItem, AgentSummary } from "./types.js";

export class AgentStore {
  private agents = new Map<string, Agent>();
  private activeAgentId: string | null = null;

  upsert(id: string, updates: Partial<Agent> & Pick<Agent, "id">): Agent {
    const existing = this.agents.get(id);
    const now = new Date().toISOString();

    if (existing) {
      const updated = { ...existing, ...updates, lastUpdate: now };
      this.agents.set(id, updated);
      return updated;
    }

    const agent: Agent = {
      id,
      name: updates.name ?? "Unknown",
      type: updates.type ?? "generic",
      status: updates.status ?? "idle",
      phase: updates.phase ?? "starting",
      progress: updates.progress ?? 0,
      pendingQuestions: updates.pendingQuestions ?? 0,
      statusLine: updates.statusLine ?? "",
      sessionId: updates.sessionId ?? "",
      projectName: updates.projectName ?? "",
      startedAt: updates.startedAt ?? now,
      lastUpdate: now,
      toolCallCount: updates.toolCallCount ?? 0,
      lastToolName: updates.lastToolName ?? null,
      errorCount: updates.errorCount ?? 0,
      staleAfterMs: updates.staleAfterMs ?? 60000,
    };
    this.agents.set(id, agent);

    if (!this.activeAgentId) {
      this.activeAgentId = id;
    }

    return agent;
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getSummary(id: string): AgentSummary | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;
    const stale = Date.now() - new Date(agent.lastUpdate).getTime() > agent.staleAfterMs;
    return { ...agent, stale };
  }

  list(): AgentListItem[] {
    return Array.from(this.agents.values()).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      status: a.status,
      progress: a.progress,
      pendingQuestions: a.pendingQuestions,
      lastUpdate: a.lastUpdate,
      projectName: a.projectName,
    }));
  }

  getActiveAgentId(): string | null {
    return this.activeAgentId;
  }

  setActiveAgent(id: string): boolean {
    if (!this.agents.has(id)) return false;
    this.activeAgentId = id;
    return true;
  }

  cycleActiveAgent(): string | null {
    const ids = Array.from(this.agents.keys());
    if (ids.length === 0) return null;
    if (!this.activeAgentId || !this.agents.has(this.activeAgentId)) {
      this.activeAgentId = ids[0];
      return this.activeAgentId;
    }
    const currentIndex = ids.indexOf(this.activeAgentId);
    const nextIndex = (currentIndex + 1) % ids.length;
    this.activeAgentId = ids[nextIndex];
    return this.activeAgentId;
  }

  delete(id: string): boolean {
    const deleted = this.agents.delete(id);
    if (this.activeAgentId === id) {
      const ids = Array.from(this.agents.keys());
      this.activeAgentId = ids[0] ?? null;
    }
    return deleted;
  }

  get size(): number {
    return this.agents.size;
  }
}
