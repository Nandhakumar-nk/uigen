import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolCallLabel, ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// ── getToolCallLabel – str_replace_editor ────────────────────────────────────

test("getToolCallLabel: str_replace_editor create returns Creating filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace returns Editing filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "Card.jsx" })).toBe("Editing Card.jsx");
});

test("getToolCallLabel: str_replace_editor insert returns Editing filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "Button.tsx" })).toBe("Editing Button.tsx");
});

test("getToolCallLabel: str_replace_editor view returns Viewing filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "index.ts" })).toBe("Viewing index.ts");
});

test("getToolCallLabel: str_replace_editor undo_edit returns Undoing changes in filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "App.jsx" })).toBe("Undoing changes in App.jsx");
});

test("getToolCallLabel: str_replace_editor unknown command defaults to Editing", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "unknown_cmd", path: "App.jsx" })).toBe("Editing App.jsx");
});

test("getToolCallLabel: str_replace_editor strips directory prefix from path", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "src/components/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor missing path falls back to 'file'", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

// ── getToolCallLabel – file_manager ─────────────────────────────────────────

test("getToolCallLabel: file_manager rename returns Renaming old to new", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "old.jsx", new_path: "new.jsx" })).toBe("Renaming old.jsx to new.jsx");
});

test("getToolCallLabel: file_manager rename strips directories from both paths", () => {
  expect(
    getToolCallLabel("file_manager", {
      command: "rename",
      path: "src/components/old.jsx",
      new_path: "src/components/new.jsx",
    })
  ).toBe("Renaming old.jsx to new.jsx");
});

test("getToolCallLabel: file_manager rename with missing new_path falls back to 'file'", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "Card.jsx" })).toBe("Renaming Card.jsx to file");
});

test("getToolCallLabel: file_manager delete returns Deleting filename", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "Card.jsx" })).toBe("Deleting Card.jsx");
});

test("getToolCallLabel: file_manager unknown command returns Processing filename", () => {
  expect(getToolCallLabel("file_manager", { command: "unknown_cmd", path: "Card.jsx" })).toBe("Processing Card.jsx");
});

test("getToolCallLabel: file_manager missing path falls back to 'file'", () => {
  expect(getToolCallLabel("file_manager", { command: "delete" })).toBe("Deleting file");
});

// ── getToolCallLabel – edge cases ────────────────────────────────────────────

test("getToolCallLabel: unknown tool name returns raw tool name", () => {
  expect(getToolCallLabel("some_other_tool", { command: "run" })).toBe("some_other_tool");
});

test("getToolCallLabel: non-object args handled gracefully", () => {
  expect(getToolCallLabel("str_replace_editor", null)).toBe("Editing file");
  expect(getToolCallLabel("str_replace_editor", undefined)).toBe("Editing file");
  expect(getToolCallLabel("str_replace_editor", "string")).toBe("Editing file");
});

// ── ToolCallBadge component ──────────────────────────────────────────────────

test("ToolCallBadge renders human-readable label not raw tool name", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
    state: "result",
    result: "ok",
  };

  render(<ToolCallBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(screen.queryByText("str_replace_editor")).toBeNull();
});

test("ToolCallBadge shows green dot when state is result", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
    state: "result",
    result: "ok",
  };

  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);

  const dot = container.querySelector(".bg-emerald-500");
  expect(dot).toBeTruthy();
});

test("ToolCallBadge shows spinner when state is call", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create", path: "App.jsx" },
    state: "call",
  };

  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);

  const spinner = container.querySelector(".animate-spin");
  expect(spinner).toBeTruthy();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows spinner when state is partial-call", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "1",
    toolName: "str_replace_editor",
    args: { command: "create" },
    state: "partial-call",
  };

  const { container } = render(<ToolCallBadge toolInvocation={toolInvocation} />);

  expect(container.querySelector(".animate-spin")).toBeTruthy();
});

test("ToolCallBadge renders file_manager delete label correctly", () => {
  const toolInvocation: ToolInvocation = {
    toolCallId: "2",
    toolName: "file_manager",
    args: { command: "delete", path: "src/Card.jsx" },
    state: "result",
    result: { success: true },
  };

  render(<ToolCallBadge toolInvocation={toolInvocation} />);

  expect(screen.getByText("Deleting Card.jsx")).toBeDefined();
});
