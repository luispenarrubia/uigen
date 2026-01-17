"use client";

import { Loader2, FileEdit, FilePlus, Eye, FileText, FolderEdit, Trash2 } from "lucide-react";

interface ToolInvocationBadgeProps {
  toolName: string;
  args: any;
  state: "partial" | "partial-call" | "call" | "result";
  result?: any;
}

function getToolDisplayInfo(toolName: string, args: any): { icon: React.ReactNode; message: string } {
  if (toolName === "str_replace_editor") {
    const command = args?.command;
    const path = args?.path || "file";
    const fileName = path.split("/").pop() || path;

    switch (command) {
      case "create":
        return {
          icon: <FilePlus className="w-3 h-3" />,
          message: `Creating ${fileName}`,
        };
      case "str_replace":
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Editing ${fileName}`,
        };
      case "insert":
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Inserting into ${fileName}`,
        };
      case "view":
        return {
          icon: <Eye className="w-3 h-3" />,
          message: `Viewing ${fileName}`,
        };
      case "undo_edit":
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Undoing edit in ${fileName}`,
        };
      default:
        return {
          icon: <FileText className="w-3 h-3" />,
          message: `Modifying ${fileName}`,
        };
    }
  } else if (toolName === "file_manager") {
    const command = args?.command;
    const path = args?.path || "file";
    const fileName = path.split("/").pop() || path;
    const newPath = args?.new_path;
    const newFileName = newPath?.split("/").pop() || newPath;

    switch (command) {
      case "rename":
        return {
          icon: <FolderEdit className="w-3 h-3" />,
          message: newFileName ? `Renaming ${fileName} to ${newFileName}` : `Renaming ${fileName}`,
        };
      case "delete":
        return {
          icon: <Trash2 className="w-3 h-3" />,
          message: `Deleting ${fileName}`,
        };
      default:
        return {
          icon: <FolderEdit className="w-3 h-3" />,
          message: `Managing ${fileName}`,
        };
    }
  }

  return {
    icon: <FileText className="w-3 h-3" />,
    message: toolName,
  };
}

export function ToolInvocationBadge({ toolName, args, state, result }: ToolInvocationBadgeProps) {
  const { icon, message } = getToolDisplayInfo(toolName, args);
  const isCompleted = state === "result" && result !== undefined;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isCompleted ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-600">{icon}</span>
          <span className="text-neutral-700">{message}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-600">{icon}</span>
          <span className="text-neutral-700">{message}</span>
        </>
      )}
    </div>
  );
}
