// @vitest-environment node
import { vi, test, expect, beforeEach, describe } from "vitest";
import { jwtVerify, SignJWT } from "jose";

const mockCookieStore = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, getSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function createTestToken(userId: string, email: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return new SignJWT({ userId, email, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie named auth-token", async () => {
    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, , options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("sets a non-secure cookie outside production", async () => {
    await createSession("user-123", "test@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);
  });

  test("embeds userId and email in the JWT token", async () => {
    await createSession("user-123", "test@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("test@example.com");
  });

  test("sets cookie expiry approximately 7 days in the future", async () => {
    const before = Date.now();
    await createSession("user-123", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const expiresMs = (options.expires as Date).getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValueOnce(undefined);

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns the session payload for a valid token", async () => {
    const token = await createTestToken("user-123", "test@example.com");
    mockCookieStore.get.mockReturnValueOnce({ value: token });

    const session = await getSession();
    expect(session?.userId).toBe("user-123");
    expect(session?.email).toBe("test@example.com");
  });

  test("returns null for a malformed token", async () => {
    mockCookieStore.get.mockReturnValueOnce({ value: "not-a-valid-jwt" });

    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const expiredToken = await new SignJWT({
      userId: "user-123",
      email: "test@example.com",
      expiresAt: new Date(),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("-1s")
      .setIssuedAt()
      .sign(JWT_SECRET);
    mockCookieStore.get.mockReturnValueOnce({ value: expiredToken });

    const session = await getSession();
    expect(session).toBeNull();
  });
});
