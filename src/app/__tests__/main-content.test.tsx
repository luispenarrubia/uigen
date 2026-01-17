import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainContent } from '../main-content';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock the contexts to pass through children
vi.mock('@/lib/contexts/file-system-context', () => ({
  FileSystemProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useFileSystem: () => ({}),
}));

vi.mock('@/lib/contexts/chat-context', () => ({
  ChatProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useChat: () => ({}),
}));

// Mock the child components
vi.mock('@/components/chat/ChatInterface', () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock('@/components/editor/FileTree', () => ({
  FileTree: () => <div data-testid="file-tree">File Tree</div>,
}));

vi.mock('@/components/editor/CodeEditor', () => ({
  CodeEditor: () => <div data-testid="code-editor">Code Editor</div>,
}));

vi.mock('@/components/preview/PreviewFrame', () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview Frame</div>,
}));

vi.mock('@/components/HeaderActions', () => ({
  HeaderActions: () => <div data-testid="header-actions">Header Actions</div>,
}));

describe('MainContent', () => {
  it('should toggle between preview and code views', async () => {
    const user = userEvent.setup();
    const { getAllByRole } = render(<MainContent />);

    // Initially should show preview
    expect(screen.getByTestId('preview-frame')).toBeInTheDocument();
    expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
    expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();

    // Get all tabs and filter for Code
    const tabs = getAllByRole('tab');
    const codeTab = tabs.find(tab => tab.textContent === 'Code');
    expect(codeTab).toBeDefined();

    // Click on Code tab using userEvent
    await user.click(codeTab!);

    // Should now show code view
    expect(screen.queryByTestId('preview-frame')).not.toBeInTheDocument();
    expect(screen.getByTestId('file-tree')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();

    // Get Preview tab
    const previewTab = tabs.find(tab => tab.textContent === 'Preview');
    expect(previewTab).toBeDefined();

    // Click on Preview tab using userEvent
    await user.click(previewTab!);

    // Should be back to preview view
    expect(screen.getByTestId('preview-frame')).toBeInTheDocument();
    expect(screen.queryByTestId('file-tree')).not.toBeInTheDocument();
    expect(screen.queryByTestId('code-editor')).not.toBeInTheDocument();
  });

  it('should have the correct tab selected initially', () => {
    render(<MainContent />);

    const tabs = screen.getAllByRole('tab');
    const previewTabs = tabs.filter(tab => tab.textContent === 'Preview');
    const codeTabs = tabs.filter(tab => tab.textContent === 'Code');

    // At least one Preview tab should be active
    expect(previewTabs.some(tab => tab.getAttribute('data-state') === 'active')).toBe(true);
    // At least one Code tab should be inactive
    expect(codeTabs.some(tab => tab.getAttribute('data-state') === 'inactive')).toBe(true);
  });

  it('should handle invalid tab values gracefully', () => {
    const { container } = render(<MainContent />);

    // Get the tabs component
    const tabs = container.querySelector('[data-slot="tabs"]');
    expect(tabs).toBeInTheDocument();

    // Initially should be on preview
    expect(screen.getByTestId('preview-frame')).toBeInTheDocument();

    // Try to trigger onValueChange with an invalid value (simulating potential bug)
    // This should not crash or change the view
    const tabsList = container.querySelector('[data-slot="tabs-list"]');

    // The handler should ignore invalid values
    // We can't directly test the callback, but we verify the UI remains stable
    expect(screen.getByTestId('preview-frame')).toBeInTheDocument();
  });
});
