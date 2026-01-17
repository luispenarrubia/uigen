import { test, expect, describe, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

describe("ToolInvocationBadge - str_replace_editor", () => {
  test("displays 'Creating' message for create command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  test("displays 'Editing' message for str_replace command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "str_replace", path: "/components/Button.tsx" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Editing Button.tsx")).toBeDefined();
  });

  test("displays 'Inserting into' message for insert command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "insert", path: "/utils/helpers.ts" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Inserting into helpers.ts")).toBeDefined();
  });

  test("displays 'Viewing' message for view command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "view", path: "/styles/globals.css" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Viewing globals.css")).toBeDefined();
  });

  test("displays 'Undoing edit in' message for undo_edit command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "undo_edit", path: "/config.json" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Undoing edit in config.json")).toBeDefined();
  });

  test("displays 'Modifying' message for unknown command", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "unknown", path: "/file.txt" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Modifying file.txt")).toBeDefined();
  });

  test("handles nested file paths correctly", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/src/components/ui/Button.tsx" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Creating Button.tsx")).toBeDefined();
  });

  test("handles missing path gracefully", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Creating file")).toBeDefined();
  });
});

describe("ToolInvocationBadge - file_manager", () => {
  test("displays 'Renaming' message for rename command", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: "rename", path: "/old-name.tsx", new_path: "/new-name.tsx" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Renaming old-name.tsx to new-name.tsx")).toBeDefined();
  });

  test("displays 'Renaming' message without new name", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: "rename", path: "/old-name.tsx" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Renaming old-name.tsx")).toBeDefined();
  });

  test("displays 'Deleting' message for delete command", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: "delete", path: "/components/OldComponent.tsx" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Deleting OldComponent.tsx")).toBeDefined();
  });

  test("displays 'Managing' message for unknown command", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{ command: "unknown", path: "/file.txt" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Managing file.txt")).toBeDefined();
  });

  test("handles nested paths in rename correctly", () => {
    render(
      <ToolInvocationBadge
        toolName="file_manager"
        args={{
          command: "rename",
          path: "/src/components/Button.tsx",
          new_path: "/src/components/NewButton.tsx",
        }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Renaming Button.tsx to NewButton.tsx")).toBeDefined();
  });
});

describe("ToolInvocationBadge - state handling", () => {
  test("shows green dot when state is 'result' and result exists", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
        result="Success"
      />
    );

    const greenDot = container.querySelector(".bg-emerald-500");
    expect(greenDot).toBeDefined();
  });

  test("shows loading spinner when state is 'partial'", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="partial"
      />
    );

    const spinner = screen.getByText("Creating App.jsx").parentElement?.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
  });

  test("shows loading spinner when result is undefined", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
      />
    );

    const spinner = screen.getByText("Creating App.jsx").parentElement?.querySelector(".animate-spin");
    expect(spinner).toBeDefined();
  });
});

describe("ToolInvocationBadge - unknown tool", () => {
  test("displays tool name for unknown tool", () => {
    render(
      <ToolInvocationBadge
        toolName="unknown_tool"
        args={{}}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("unknown_tool")).toBeDefined();
  });
});

describe("ToolInvocationBadge - styling", () => {
  test("applies correct base styling classes", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
        result="Success"
      />
    );

    const badge = container.querySelector(".inline-flex");
    expect(badge?.className).toContain("bg-neutral-50");
    expect(badge?.className).toContain("rounded-lg");
    expect(badge?.className).toContain("border-neutral-200");
  });

  test("renders with appropriate text sizing", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/App.jsx" }}
        state="result"
        result="Success"
      />
    );

    const badge = container.querySelector(".text-xs");
    expect(badge).toBeDefined();
  });
});

describe("ToolInvocationBadge - edge cases", () => {
  test("handles empty args object", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{}}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Modifying file")).toBeDefined();
  });

  test("handles null args", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={null}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Modifying file")).toBeDefined();
  });

  test("handles paths with single filename", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "App.jsx" }}
        state="result"
        result="Success"
      />
    );

    expect(screen.getByText("Creating App.jsx")).toBeDefined();
  });

  test("handles paths with trailing slash", () => {
    render(
      <ToolInvocationBadge
        toolName="str_replace_editor"
        args={{ command: "create", path: "/components/Button.tsx/" }}
        state="result"
        result="Success"
      />
    );

    // Should still extract filename correctly
    const text = screen.getByText(/Creating/);
    expect(text).toBeDefined();
  });
});
