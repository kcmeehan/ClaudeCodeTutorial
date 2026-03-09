import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// ---- getToolLabel unit tests ----

test("getToolLabel: str_replace_editor + create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/components/Button.jsx" }))
    .toBe("Creating `Button.jsx`");
});

test("getToolLabel: str_replace_editor + str_replace", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/App.jsx" }))
    .toBe("Editing `App.jsx`");
});

test("getToolLabel: str_replace_editor + insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/App.jsx" }))
    .toBe("Editing `App.jsx`");
});

test("getToolLabel: str_replace_editor + view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/utils/helpers.ts" }))
    .toBe("Viewing `helpers.ts`");
});

test("getToolLabel: str_replace_editor + undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" }))
    .toBe("Undoing edit to `App.jsx`");
});

test("getToolLabel: file_manager + rename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/App.jsx", new_path: "/Main.jsx" }))
    .toBe("Renaming `App.jsx` to `Main.jsx`");
});

test("getToolLabel: file_manager + delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/components/Old.jsx" }))
    .toBe("Deleting `Old.jsx`");
});

test("getToolLabel: unknown tool falls back to raw toolName", () => {
  expect(getToolLabel("some_unknown_tool", { command: "do_thing" }))
    .toBe("some_unknown_tool");
});

test("getToolLabel: known tool with unknown command falls back to raw toolName", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown_command", path: "/App.jsx" }))
    .toBe("str_replace_editor");
});

test("getToolLabel: incomplete args falls back to raw toolName", () => {
  expect(getToolLabel("str_replace_editor", {}))
    .toBe("str_replace_editor");
});

test("getToolLabel: null args falls back to raw toolName", () => {
  expect(getToolLabel("str_replace_editor", null))
    .toBe("str_replace_editor");
});

test("getToolLabel: filename extracted from nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/a/b/c/MyComponent.tsx" }))
    .toBe("Creating `MyComponent.tsx`");
});

// ---- ToolInvocationBadge component tests ----

test("ToolInvocationBadge renders friendly label in result state", () => {
  const invocation: ToolInvocation = {
    state: "result",
    toolCallId: "abc",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    result: "ok",
  };
  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByText("Creating `App.jsx`")).toBeDefined();
});

test("ToolInvocationBadge shows green dot in result state", () => {
  const invocation: ToolInvocation = {
    state: "result",
    toolCallId: "abc",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    result: "ok",
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolInvocationBadge shows spinner in call state", () => {
  const invocation: ToolInvocation = {
    state: "call",
    toolCallId: "abc",
    toolName: "str_replace_editor",
    args: { command: "str_replace", path: "/App.jsx" },
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolInvocationBadge shows spinner in partial-call state", () => {
  const invocation: ToolInvocation = {
    state: "partial-call",
    toolCallId: "abc",
    toolName: "str_replace_editor",
    args: {},
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolInvocationBadge with null result shows spinner not green dot", () => {
  const invocation: ToolInvocation = {
    state: "result",
    toolCallId: "abc",
    toolName: "str_replace_editor",
    args: { command: "view", path: "/App.jsx" },
    result: null,
  };
  const { container } = render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolInvocationBadge renders fallback label for unknown tool", () => {
  const invocation: ToolInvocation = {
    state: "call",
    toolCallId: "xyz",
    toolName: "mystery_tool",
    args: {},
  };
  render(<ToolInvocationBadge toolInvocation={invocation} />);
  expect(screen.getByText("mystery_tool")).toBeDefined();
});
