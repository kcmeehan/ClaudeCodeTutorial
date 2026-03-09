"use client";

import type { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

export function getToolLabel(toolName: string, args: unknown): string {
  const a = args as Record<string, unknown> | null | undefined;
  const command = typeof a?.command === "string" ? a.command : null;
  const path = typeof a?.path === "string" ? a.path : null;
  const newPath = typeof a?.new_path === "string" ? a.new_path : null;
  const filename = (p: string) => p.split("/").filter(Boolean).at(-1) ?? p;

  if (toolName === "str_replace_editor" && command && path) {
    const file = filename(path);
    switch (command) {
      case "create":     return `Creating \`${file}\``;
      case "str_replace":
      case "insert":     return `Editing \`${file}\``;
      case "view":       return `Viewing \`${file}\``;
      case "undo_edit":  return `Undoing edit to \`${file}\``;
    }
  }

  if (toolName === "file_manager" && command && path) {
    const file = filename(path);
    switch (command) {
      case "rename": {
        const newFile = newPath ? filename(newPath) : "unknown";
        return `Renaming \`${file}\` to \`${newFile}\``;
      }
      case "delete": return `Deleting \`${file}\``;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const label = getToolLabel(toolInvocation.toolName, toolInvocation.args);
  const isDone = toolInvocation.state === "result" && toolInvocation.result != null;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
