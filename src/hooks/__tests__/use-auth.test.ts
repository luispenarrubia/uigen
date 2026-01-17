import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { useAuth } from "../use-auth";
import * as signInAction from "@/actions";
import * as anonWorkTracker from "@/lib/anon-work-tracker";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";

// Create mock push function at top level
const mockRouterPush = vi.fn();

// Mock dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("signIn", () => {
    test("returns result on successful sign in with no anonymous work", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Test Project", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "password123");
      });

      expect(signInResult).toEqual({ success: true });
      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith("/project-1");
    });

    test("sets isLoading state during sign in", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      mockSignIn.mockReturnValue(signInPromise as Promise<any>);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "new-project",
        name: "New Design",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveSignIn!({ success: true });
        await signInPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("returns error result on failed sign in", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);

      mockSignIn.mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrongpassword");
      });

      expect(signInResult).toEqual({ success: false, error: "Invalid credentials" });
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    test("creates project from anonymous work after sign in", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockClearAnonWork = vi.mocked(anonWorkTracker.clearAnonWork);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      const anonWorkData = {
        messages: [
          { id: "1", role: "user" as const, content: "Create a button" },
          { id: "2", role: "assistant" as const, content: "Here's a button" },
        ],
        fileSystemData: { "/App.jsx": { type: "file" as const, content: "export default App" } },
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({
        id: "new-project-123",
        name: "Design from 10:30:00 AM",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWorkData.messages,
        data: anonWorkData.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith("/new-project-123");
    });

    test("navigates to most recent project after sign in", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Most Recent", createdAt: new Date(), updatedAt: new Date() },
        { id: "project-2", name: "Older Project", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockRouterPush).toHaveBeenCalledWith("/project-1");
    });

    test("creates new project when user has no projects", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "new-project-456",
        name: "New Design #12345",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockRouterPush).toHaveBeenCalledWith("/new-project-456");
    });

    test("does not clear anonymous work if it has no messages", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockClearAnonWork = vi.mocked(anonWorkTracker.clearAnonWork);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Test", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith("/project-1");
    });

    test("resets isLoading even if sign in throws error", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);

      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password123");
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("returns result on successful sign up with no anonymous work", async () => {
      const mockSignUp = vi.mocked(signInAction.signUp);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "new-project",
        name: "New Design",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp("newuser@example.com", "password123");
      });

      expect(signUpResult).toEqual({ success: true });
      expect(mockSignUp).toHaveBeenCalledWith("newuser@example.com", "password123");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
    });

    test("sets isLoading state during sign up", async () => {
      const mockSignUp = vi.mocked(signInAction.signUp);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });

      mockSignUp.mockReturnValue(signUpPromise as Promise<any>);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "new-project",
        name: "New Design",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signUp("newuser@example.com", "password123");
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolveSignUp!({ success: true });
        await signUpPromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("returns error result on failed sign up", async () => {
      const mockSignUp = vi.mocked(signInAction.signUp);

      mockSignUp.mockResolvedValue({ success: false, error: "Email already exists" });

      const { result } = renderHook(() => useAuth());

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp("existing@example.com", "password123");
      });

      expect(signUpResult).toEqual({ success: false, error: "Email already exists" });
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    test("creates project from anonymous work after sign up", async () => {
      const mockSignUp = vi.mocked(signInAction.signUp);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockClearAnonWork = vi.mocked(anonWorkTracker.clearAnonWork);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      const anonWorkData = {
        messages: [
          { id: "1", role: "user" as const, content: "Create a form" },
        ],
        fileSystemData: { "/App.jsx": { type: "file" as const, content: "form content" } },
      };

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({
        id: "new-project-789",
        name: "Design from 11:15:30 AM",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-2",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWorkData.messages,
        data: anonWorkData.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith("/new-project-789");
    });

    test("creates new project for new user with no existing projects", async () => {
      const mockSignUp = vi.mocked(signInAction.signUp);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "first-project",
        name: "New Design #99999",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-3",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("newuser@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockRouterPush).toHaveBeenCalledWith("/first-project");
    });

    test("resets isLoading even if sign up throws error", async () => {
      const mockSignUp = vi.mocked(signInAction.signUp);

      mockSignUp.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signUp("test@example.com", "password123");
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn flow", () => {
    test("prioritizes anonymous work over existing projects", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      const anonWorkData = {
        messages: [{ id: "1", role: "user" as const, content: "Hello" }],
        fileSystemData: {},
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockGetProjects.mockResolvedValue([
        { id: "existing-project", name: "Existing", createdAt: new Date(), updatedAt: new Date() },
      ]);
      mockCreateProject.mockResolvedValue({
        id: "anon-work-project",
        name: "Design from 2:00:00 PM",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockGetProjects).not.toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith("/anon-work-project");
    });

    test("generates random project name within expected range", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({
        id: "random-project",
        name: "New Design #12345",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      const createCall = mockCreateProject.mock.calls[0][0];
      const nameMatch = createCall.name.match(/^New Design #(\d+)$/);

      expect(nameMatch).not.toBeNull();

      if (nameMatch) {
        const number = parseInt(nameMatch[1], 10);
        expect(number).toBeGreaterThanOrEqual(0);
        expect(number).toBeLessThan(100000);
      }
    });
  });

  describe("edge cases", () => {
    test("handles empty string email and password", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);

      mockSignIn.mockResolvedValue({ success: false, error: "Invalid input" });

      const { result } = renderHook(() => useAuth());

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn("", "");
      });

      expect(mockSignIn).toHaveBeenCalledWith("", "");
      expect(signInResult).toEqual({ success: false, error: "Invalid input" });
    });

    test("handles very long email addresses", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);

      const longEmail = "a".repeat(250) + "@example.com";

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Test", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn(longEmail, "password");
      });

      expect(mockSignIn).toHaveBeenCalledWith(longEmail, "password");
    });

    test("handles special characters in email", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);

      const emailWithSpecialChars = "test+special@example.co.uk";

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Test", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn(emailWithSpecialChars, "password");
      });

      expect(mockSignIn).toHaveBeenCalledWith(emailWithSpecialChars, "password");
    });

    test("handles anonymous work with empty fileSystemData", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockCreateProject = vi.mocked(createProjectAction.createProject);
      const mockClearAnonWork = vi.mocked(anonWorkTracker.clearAnonWork);

      const anonWorkData = {
        messages: [{ id: "1", role: "user" as const, content: "Test" }],
        fileSystemData: {},
      };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWorkData);
      mockCreateProject.mockResolvedValue({
        id: "empty-fs-project",
        name: "Design from 3:00:00 PM",
        messages: "[]",
        data: "{}",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "user-1",
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonWorkData.messages,
        data: {},
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
    });

    test("handles getAnonWorkData returning null", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Test", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith("/project-1");
    });

    test("consecutive signIn calls maintain separate loading states", async () => {
      const mockSignIn = vi.mocked(signInAction.signIn);
      const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
      const mockGetProjects = vi.mocked(getProjectsAction.getProjects);

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "project-1", name: "Test", createdAt: new Date(), updatedAt: new Date() },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user1@example.com", "password1");
      });

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.signIn("user2@example.com", "password2");
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
  });
});
