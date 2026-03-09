import { describe, it, expect, beforeEach } from "vitest";
import { AgentStore } from "../src/store/agent-store.js";

describe("AgentStore", () => {
  let store: AgentStore;

  beforeEach(() => {
    store = new AgentStore();
  });

  it("creates a new agent with defaults", () => {
    const agent = store.upsert("claude-abc", { id: "claude-abc", name: "Claude Code", type: "claude-code" });
    expect(agent.id).toBe("claude-abc");
    expect(agent.name).toBe("Claude Code");
    expect(agent.status).toBe("idle");
    expect(agent.phase).toBe("starting");
    expect(agent.progress).toBe(0);
    expect(store.size).toBe(1);
  });

  it("updates existing agent preserving unchanged fields", () => {
    store.upsert("claude-abc", { id: "claude-abc", name: "Claude Code", type: "claude-code", status: "working" });
    const updated = store.upsert("claude-abc", { id: "claude-abc", progress: 50 });
    expect(updated.name).toBe("Claude Code");
    expect(updated.status).toBe("working");
    expect(updated.progress).toBe(50);
  });

  it("sets first agent as active automatically", () => {
    store.upsert("claude-1", { id: "claude-1" });
    expect(store.getActiveAgentId()).toBe("claude-1");
  });

  it("does not change active agent when adding more", () => {
    store.upsert("claude-1", { id: "claude-1" });
    store.upsert("claude-2", { id: "claude-2" });
    expect(store.getActiveAgentId()).toBe("claude-1");
  });

  it("cycles through agents", () => {
    store.upsert("a", { id: "a" });
    store.upsert("b", { id: "b" });
    store.upsert("c", { id: "c" });
    expect(store.getActiveAgentId()).toBe("a");
    expect(store.cycleActiveAgent()).toBe("b");
    expect(store.cycleActiveAgent()).toBe("c");
    expect(store.cycleActiveAgent()).toBe("a");
  });

  it("returns summary with stale=false for fresh agent", () => {
    store.upsert("claude-abc", { id: "claude-abc", staleAfterMs: 60000 });
    const summary = store.getSummary("claude-abc");
    expect(summary).toBeDefined();
    expect(summary!.stale).toBe(false);
  });

  it("lists agents as AgentListItem", () => {
    store.upsert("a", { id: "a", name: "Agent A", type: "claude-code", projectName: "proj" });
    const list = store.list();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("a");
    expect(list[0].projectName).toBe("proj");
  });

  it("deletes agent and updates active", () => {
    store.upsert("a", { id: "a" });
    store.upsert("b", { id: "b" });
    store.setActiveAgent("a");
    store.delete("a");
    expect(store.size).toBe(1);
    expect(store.getActiveAgentId()).toBe("b");
  });
});
