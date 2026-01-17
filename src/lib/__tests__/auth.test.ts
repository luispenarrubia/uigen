import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";

// @vitest-environment node

// Mock next/headers
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock server-only to avoid errors in test environment
vi.mock("server-only", () => ({}));

// Import after mocks and environment setup
import { createSession } from "../auth";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createSession", () => {
  test("creates a session with valid userId and email", async () => {
    const userId = "user-123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);

    const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];

    expect(cookieName).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(options).toMatchObject({
      httpOnly: true,
      secure: false, // NODE_ENV is test
      sameSite: "lax",
      path: "/",
    });
    expect(options.expires).toBeInstanceOf(Date);
  });

  test("sets cookie with 7-day expiration", async () => {
    const userId = "user-123";
    const email = "test@example.com";
    const beforeCall = Date.now();

    await createSession(userId, email);

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresAt = options.expires as Date;
    const afterCall = Date.now();

    // Should be approximately 7 days from now
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const expectedMin = beforeCall + sevenDays;
    const expectedMax = afterCall + sevenDays;

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  test("creates JWT token with correct payload structure", async () => {
    const userId = "user-456";
    const email = "another@example.com";

    await createSession(userId, email);

    const [, token] = mockCookieStore.set.mock.calls[0];

    // Decode the JWT to verify its structure (without verification for testing)
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString()
    );

    expect(payload.userId).toBe(userId);
    expect(payload.email).toBe(email);
    expect(payload.expiresAt).toBeDefined();
    expect(payload.iat).toBeDefined(); // issued at
    expect(payload.exp).toBeDefined(); // expiration
  });

  test("sets secure cookie in production environment", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const userId = "user-789";
    const email = "prod@example.com";

    await createSession(userId, email);

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.secure).toBe(true);

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  test("sets non-secure cookie in development environment", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const userId = "user-101";
    const email = "dev@example.com";

    await createSession(userId, email);

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.secure).toBe(false);

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  test("creates unique tokens for different users", async () => {
    await createSession("user-1", "user1@example.com");
    const token1 = mockCookieStore.set.mock.calls[0][1];

    mockCookieStore.set.mockClear();

    // Need a small delay to ensure different iat timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await createSession("user-2", "user2@example.com");
    const token2 = mockCookieStore.set.mock.calls[0][1];

    expect(token1).not.toBe(token2);
  });

  test("handles special characters in email", async () => {
    const userId = "user-special";
    const email = "test+special@example.com";

    await createSession(userId, email);

    const [, token] = mockCookieStore.set.mock.calls[0];
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString()
    );

    expect(payload.email).toBe(email);
  });

  test("sets httpOnly flag to prevent JavaScript access", async () => {
    await createSession("user-secure", "secure@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.httpOnly).toBe(true);
  });

  test("sets sameSite to lax for CSRF protection", async () => {
    await createSession("user-csrf", "csrf@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.sameSite).toBe("lax");
  });

  test("sets cookie path to root", async () => {
    await createSession("user-path", "path@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.path).toBe("/");
  });

  test("creates valid JWT with HS256 algorithm", async () => {
    await createSession("user-alg", "alg@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];

    // Decode the header to verify algorithm
    const [headerBase64] = token.split(".");
    const header = JSON.parse(
      Buffer.from(headerBase64, "base64url").toString()
    );

    expect(header.alg).toBe("HS256");
  });

  test("handles very long email addresses", async () => {
    const userId = "user-long";
    const email = "a".repeat(200) + "@example.com";

    await createSession(userId, email);

    const [, token] = mockCookieStore.set.mock.calls[0];
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString()
    );

    expect(payload.email).toBe(email);
  });

  test("handles numeric-like userId strings", async () => {
    const userId = "12345";
    const email = "numeric@example.com";

    await createSession(userId, email);

    const [, token] = mockCookieStore.set.mock.calls[0];
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString()
    );

    expect(payload.userId).toBe(userId);
    expect(typeof payload.userId).toBe("string");
  });

  test("creates session with UUID-formatted userId", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const email = "uuid@example.com";

    await createSession(userId, email);

    const [, token] = mockCookieStore.set.mock.calls[0];
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString()
    );

    expect(payload.userId).toBe(userId);
  });

  test("JWT exp claim matches 7-day expiration", async () => {
    const beforeCall = Date.now();

    await createSession("user-exp", "exp@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const [, payloadBase64] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString()
    );

    const afterCall = Date.now();

    // exp is in seconds, not milliseconds
    const expMs = payload.exp * 1000;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    // Allow a 2-second buffer before and 2-second buffer after
    expect(expMs).toBeGreaterThanOrEqual(beforeCall + sevenDays - 2000);
    expect(expMs).toBeLessThanOrEqual(afterCall + sevenDays + 2000);
  });
});
