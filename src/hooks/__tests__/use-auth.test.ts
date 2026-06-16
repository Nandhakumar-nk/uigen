import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue({ id: "default-project-id" });
  });

  describe("signIn", () => {
    test("returns success result on valid credentials", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "password123");
      });

      expect(signInResult).toEqual({ success: true });
      expect(signInAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns failure result on invalid credentials and does not redirect", async () => {
      (signInAction as any).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      let signInResult: any;
      await act(async () => {
        signInResult = await result.current.signIn("test@example.com", "wrongpass");
      });

      expect(signInResult).toEqual({
        success: false,
        error: "Invalid credentials",
      });
      expect(mockPush).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
    });

    test("sets isLoading to true during the request and false afterwards", async () => {
      let resolveSignIn: (value: any) => void;
      (signInAction as any).mockReturnValue(
        new Promise((resolve) => {
          resolveSignIn = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password123");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveSignIn!({ success: true });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading even when the sign in action throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signIn("test@example.com", "password123")).rejects.toThrow(
          "network error"
        );
      });

      expect(result.current.isLoading).toBe(false);
    });

    describe("post sign-in redirect behavior", () => {
      test("creates project from anonymous work and redirects to it when anon work exists", async () => {
        (signInAction as any).mockResolvedValue({ success: true });
        (getAnonWorkData as any).mockReturnValue({
          messages: [{ role: "user", content: "hello" }],
          fileSystemData: { "/": { type: "directory" } },
        });
        (createProject as any).mockResolvedValue({ id: "anon-project-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: "user", content: "hello" }],
            data: { "/": { type: "directory" } },
          })
        );
        expect(clearAnonWork).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
        expect(getProjects).not.toHaveBeenCalled();
      });

      test("redirects to most recent project when anon work is empty and projects exist", async () => {
        (signInAction as any).mockResolvedValue({ success: true });
        (getAnonWorkData as any).mockReturnValue({
          messages: [],
          fileSystemData: {},
        });
        (getProjects as any).mockResolvedValue([{ id: "recent-project" }, { id: "older-project" }]);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).not.toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith("/recent-project");
      });

      test("creates a new project and redirects when no anon work and no projects exist", async () => {
        (signInAction as any).mockResolvedValue({ success: true });
        (getAnonWorkData as any).mockReturnValue(null);
        (getProjects as any).mockResolvedValue([]);
        (createProject as any).mockResolvedValue({ id: "new-project-id" });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "password123");
        });

        expect(createProject).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [],
            data: {},
          })
        );
        expect(mockPush).toHaveBeenCalledWith("/new-project-id");
      });

      test("does not perform post sign-in redirect logic when sign in fails", async () => {
        (signInAction as any).mockResolvedValue({
          success: false,
          error: "Invalid credentials",
        });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
          await result.current.signIn("test@example.com", "wrongpass");
        });

        expect(getAnonWorkData).not.toHaveBeenCalled();
        expect(getProjects).not.toHaveBeenCalled();
        expect(createProject).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe("signUp", () => {
    test("returns success result on valid signup", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([{ id: "project-1" }]);

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("new@example.com", "password123");
      });

      expect(signUpResult).toEqual({ success: true });
      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "password123");
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("returns failure result when email already registered", async () => {
      (signUpAction as any).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());

      let signUpResult: any;
      await act(async () => {
        signUpResult = await result.current.signUp("existing@example.com", "password123");
      });

      expect(signUpResult).toEqual({
        success: false,
        error: "Email already registered",
      });
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to true during the request and false afterwards", async () => {
      let resolveSignUp: (value: any) => void;
      (signUpAction as any).mockReturnValue(
        new Promise((resolve) => {
          resolveSignUp = resolve;
        })
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("new@example.com", "password123");
      });

      await waitFor(() => expect(result.current.isLoading).toBe(true));

      await act(async () => {
        resolveSignUp!({ success: true });
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading even when the sign up action throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.signUp("new@example.com", "password123")).rejects.toThrow(
          "network error"
        );
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("creates project from anonymous work and redirects after signup", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [{ role: "user", content: "hi" }],
        fileSystemData: { "/": { type: "directory" } },
      });
      (createProject as any).mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: "user", content: "hi" }],
          data: { "/": { type: "directory" } },
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
    });
  });
});
