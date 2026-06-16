"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

export function getToolCallLabel(toolName: string, args: unknown): string {
  const safeArgs = args && typeof args === "object" ? (args as Record<string, unknown>) : {};

  if (toolName === "str_replace_editor") {
    const command = safeArgs.command as string | undefined;
    const path = safeArgs.path as string | undefined;
    const fileName = path ? getFileName(path) : "file";

    switch (command) {
      case "create":
        return `Creating ${fileName}`;
      case "str_replace":
      case "insert":
        return `Editing ${fileName}`;
      case "view":
        return `Viewing ${fileName}`;
      case "undo_edit":
        return `Undoing changes in ${fileName}`;
      default:
        return `Editing ${fileName}`;
    }
  }

  if (toolName === "file_manager") {
    const command = safeArgs.command as string | undefined;
    const path = safeArgs.path as string | undefined;
    const newPath = safeArgs.new_path as string | undefined;
    const fileName = path ? getFileName(path) : "file";

    switch (command) {
      case "rename": {
        const newFileName = newPath ? getFileName(newPath) : "file";
        return `Renaming ${fileName} to ${newFileName}`;
      }
      case "delete":
        return `Deleting ${fileName}`;
      default:
        return `Processing ${fileName}`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const label = getToolCallLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
