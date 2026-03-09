import { describe, it, expect, beforeEach } from "vitest";
import { AgentStore } from "../src/store/agent-store.js";
import {
  handleSessionStart,
  handlePostToolUse,
  handlePostToolUseFailure,
  handleNotification,
  handleStop,
  handleSessionEnd,
} from "../src/adapters/claude-code.js";

describe("Claude Code Adapter", () => {
  let store: AgentStore;

  beforeEach(() => {
    store = new AgentStore();
  });

  it("creates agent on session-start", () => {
    handleSessionStart(store, { session_id: "abc123", cwd: "/home/user/my-project" });
    const agent = store.get("claude-abc123");
    expect(agent).toBeDefined();
    expect(agent!.name).toBe("Claude Code");
    expect(agent!.type).toBe("claude-code");
    expect(agent!.status).toBe("working");
    expect(agent!.phase).toBe("starting");
    expect(agent!.projectName).toBe("my-project");
  });

  it("ignores session-start without session_id", () => {
    handleSessionStart(store, {});
    expect(store.size).toBe(0);
  });

  it("updates agent on post-tool-use", () => {
    handleSessionStart(store, { session_id: "abc" });
    handlePostToolUse(store, {
      session_id: "abc",
      tool_name: "Edit",
      tool_input: { file_path: "/src/main.ts" },
    });
    const agent = store.get("claude-abc");
    expect(agent!.phase).toBe("implementing");
    expect(agent!.toolCallCount).toBe(1);
    expect(agent!.lastToolName).toBe("Edit");
    expect(agent!.statusLine).toContain("main.ts");
  });

  it("creates agent if post-tool-use arrives before session-start", () => {
    handlePostToolUse(store, {
      session_id: "xyz",
      tool_name: "Read",
      tool_input: { file_path: "/src/index.ts" },
    });
    expect(store.get("claude-xyz")).toBeDefined();
  });

  it("infers testing phase from Bash test commands", () => {
    handleSessionStart(store, { session_id: "t1" });
    handlePostToolUse(store, {
      session_id: "t1",
      tool_name: "Bash",
      tool_input: { command: "pnpm test" },
    });
    expect(store.get("claude-t1")!.phase).toBe("testing");
  });

  it("increments errorCount on failure", () => {
    handleSessionStart(store, { session_id: "e1" });
    handlePostToolUseFailure(store, { session_id: "e1", tool_name: "Bash" });
    expect(store.get("claude-e1")!.errorCount).toBe(1);
  });

  it("increments pendingQuestions on notification", () => {
    handleSessionStart(store, { session_id: "n1" });
    handleNotification(store, { session_id: "n1" });
    const agent = store.get("claude-n1")!;
    expect(agent.pendingQuestions).toBe(1);
    expect(agent.status).toBe("waiting");
  });

  it("sets idle on stop", () => {
    handleSessionStart(store, { session_id: "s1" });
    handleStop(store, { session_id: "s1" });
    const agent = store.get("claude-s1")!;
    expect(agent.status).toBe("idle");
    expect(agent.progress).toBe(100);
    expect(agent.phase).toBe("reviewing");
  });

  it("sets stopped on session-end", () => {
    handleSessionStart(store, { session_id: "se1" });
    handleSessionEnd(store, { session_id: "se1" });
    expect(store.get("claude-se1")!.status).toBe("stopped");
  });
});
