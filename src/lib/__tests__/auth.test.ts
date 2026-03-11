// @vitest-environment node
import { webcrypto } from "crypto";
// jose's webapi build requires a global `crypto` with SubtleCrypto
Object.defineProperty(globalThis, "crypto", { value: webcrypto });

import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const { mockCookieGet, mockCookieSet, mockCookies } = vi.hoisted(() => {
  const mockCookieGet = vi.fn();
  const mockCookieSet = vi.fn();
  const mockCookies = vi.fn().mockResolvedValue({ get: mockCookieGet, set: mockCookieSet });
  return { mockCookieGet, mockCookieSet, mockCookies };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

import { SignJWT, jwtVerify } from "jose";
import { createSession, getSession } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets an httpOnly cookie with the correct name", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockCookieSet).toHaveBeenCalledOnce();
    const [name, , options] = mockCookieSet.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(options.httpOnly).toBe(true);
  });

  test("sets cookie with correct options", async () => {
    await createSession("user-1", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.secure).toBe(false); // NODE_ENV is 'test', not 'production'
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockCookieSet.mock.calls[0];
    const expiresMs = options.expires.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs);
  });

  test("stores a valid JWT containing userId and email", async () => {
    await createSession("user-42", "hello@example.com");

    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("JWT expires in 7 days", async () => {
    const before = Math.floor(Date.now() / 1000);
    await createSession("user-1", "test@example.com");
    const after = Math.floor(Date.now() / 1000);

    const [, token] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysSec = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(before + sevenDaysSec);
    expect(payload.exp).toBeLessThanOrEqual(after + sevenDaysSec);
  });

  test("sets secure flag when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await createSession("user-1", "test@example.com");

    const [, , options] = mockCookieSet.mock.calls[0];
    expect(options.secure).toBe(true);

    vi.unstubAllEnvs();
  });

  test("JWT payload includes expiresAt matching the cookie expiry", async () => {
    await createSession("user-1", "test@example.com");

    const [, token, options] = mockCookieSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const cookieExpiresMs = options.expires.getTime();
    const payloadExpiresMs = new Date(payload.expiresAt as string).getTime();
    expect(payloadExpiresMs).toBe(cookieExpiresMs);
  });
});

async function makeToken(
  claims: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns null when no cookie is present", async () => {
    mockCookieGet.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when cookie value is empty", async () => {
    mockCookieGet.mockReturnValue({ value: "" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when cookie contains an invalid JWT", async () => {
    mockCookieGet.mockReturnValue({ value: "not.a.valid.jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when JWT is signed with the wrong secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "u1", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(wrongSecret);
    mockCookieGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when JWT is expired", async () => {
    // Set exp to 10 seconds in the past
    const expiredAt = Math.floor(Date.now() / 1000) - 10;
    const token = await new SignJWT({ userId: "u1", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expiredAt)
      .setIssuedAt()
      .sign(JWT_SECRET);
    mockCookieGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns session payload for a valid JWT", async () => {
    const token = await makeToken({ userId: "user-99", email: "foo@bar.com" });
    mockCookieGet.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("foo@bar.com");
  });
});
