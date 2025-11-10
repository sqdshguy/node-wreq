import assert from "node:assert";
import { before, describe, test } from "node:test";
import type { BrowserProfile, Session } from "../wreq-js";
import { createSession, getProfiles, Headers, RequestError, withSession, fetch as wreqFetch } from "../wreq-js";

const HTTP_TEST_BASE_URL = process.env.HTTP_TEST_BASE_URL ?? "https://httpbingo.org";
const httpUrl = (path: string) => new URL(path, HTTP_TEST_BASE_URL).toString();

function headerIndex(rawHeaders: string[], name: string) {
  return rawHeaders.findIndex((value, index) => index % 2 === 0 && value.toLowerCase() === name.toLowerCase());
}

describe("HTTP", () => {
  before(() => {
    console.log("🔌 HTTP Test Suite\n");
  });

  test("should return available browser profiles", () => {
    const profiles = getProfiles();

    assert.ok(Array.isArray(profiles), "Profiles should be an array");
    assert.ok(profiles.length > 0, "Should have at least one profile");
    assert.ok(
      profiles.some((p) => p.includes("chrome")) ||
        profiles.some((p) => p.includes("firefox")) ||
        profiles.some((p) => p.includes("safari")),
      "Should include standard browser profiles",
    );

    console.log("Available profiles:", profiles.join(", "));
  });

  test("should make a simple GET request", async () => {
    const response = await wreqFetch(httpUrl("/get"), {
      browser: "chrome_131",
      timeout: 10000,
    });

    assert.ok(response.status >= 200 && response.status < 300, "Should return successful status");
    assert.ok(response.headers.has("content-type"), "Should have response headers");

    const body = await response.json<{ headers: Record<string, string> }>();

    assert.ok(body.headers["User-Agent"], "Should have User-Agent header");
    assert.ok(response.bodyUsed, "json() should mark the body as used");

    console.log("Status:", response.status);
    console.log("User-Agent:", body.headers["User-Agent"]);
  });

  test("should work with different browser profiles", async () => {
    const testUrl = httpUrl("/user-agent");
    const browsers = ["chrome_142", "firefox_139", "safari_18"] as const;

    for (const browser of browsers) {
      const response = await wreqFetch(testUrl, {
        browser,
        timeout: 10000,
      });

      assert.ok(response.status === 200, `${browser} should return status 200`);

      const data = JSON.parse(response.body);

      assert.ok(data["user-agent"], `${browser} should have user-agent`);

      console.log(`${browser}:`, `${data["user-agent"].substring(0, 70)}...`);
    }
  });

  test("should handle timeout errors", async () => {
    await assert.rejects(
      async () => {
        await wreqFetch(httpUrl("/delay/10"), {
          browser: "chrome_142",
          timeout: 1000, // 1 second timeout for 10 second delay
        });
      },
      {
        name: "RequestError",
      },
      "Should throw an error on timeout",
    );
  });

  test("should disable default headers when requested", async () => {
    const customAccept = "*/*";
    const response = await wreqFetch(httpUrl("/headers"), {
      browser: "chrome_142",
      headers: {
        Accept: customAccept,
      },
      disableDefaultHeaders: true,
      timeout: 10000,
    });

    assert.ok(response.status === 200, "Should return status 200");

    const body = await response.json<{ headers: Record<string, string> }>();

    assert.strictEqual(
      body.headers.Accept,
      customAccept,
      "Should use only custom Accept header without emulation headers appended",
    );

    console.log("Custom Accept sent:", body.headers.Accept);
  });

  test("should append emulation headers by default", async () => {
    const customAccept = "*/*";
    const response = await wreqFetch(httpUrl("/headers"), {
      browser: "chrome_142",
      headers: {
        Accept: customAccept,
      },
      timeout: 10000,
    });

    assert.ok(response.status === 200, "Should return status 200");

    const body = await response.json<{ headers: Record<string, string> }>();
    const accept = body.headers.Accept;

    assert.ok(accept, "Should have Accept header");
    assert.ok(accept.includes(customAccept), "Should include custom Accept header");

    console.log("Accept with emulation (may be overwritten):", accept);
  });

  test("should keep custom header order intact", async () => {
    const orderedHeaders = new Headers();
    orderedHeaders.append("X-First", "one");
    orderedHeaders.append("X-Second", "two");
    orderedHeaders.append("X-Third", "three");

    const response = await wreqFetch(httpUrl("/headers"), {
      browser: "chrome_142",
      headers: orderedHeaders,
      disableDefaultHeaders: true,
      timeout: 10000,
    });

    assert.strictEqual(response.status, 200, "Should return status 200");
    const body = await response.json<{ rawHeaders: string[] }>();
    assert.ok(body.rawHeaders, "Should include rawHeaders in the response");

    const headerIndex = (name: string) =>
      body.rawHeaders.findIndex((value, index) => index % 2 === 0 && value.toLowerCase() === name.toLowerCase());

    const firstIndex = headerIndex("X-First");
    const secondIndex = headerIndex("X-Second");
    const thirdIndex = headerIndex("X-Third");

    assert.ok(firstIndex !== -1, "X-First header should be present");
    assert.ok(secondIndex !== -1, "X-Second header should be present");
    assert.ok(thirdIndex !== -1, "X-Third header should be present");
    assert.ok(firstIndex < secondIndex, "X-First should appear before X-Second");
    assert.ok(secondIndex < thirdIndex, "X-Second should appear before X-Third");
  });

  test("should keep object header order intact", async () => {
    const response = await wreqFetch(httpUrl("/headers"), {
      browser: "chrome_142",
      headers: {
        "X-Start": "alpha",
        "X-Middle": "beta",
        "X-End": "gamma",
      },
      disableDefaultHeaders: true,
      timeout: 10000,
    });

    assert.strictEqual(response.status, 200, "Should return status 200");
    const body = await response.json<{ rawHeaders: string[] }>();
    assert.ok(body.rawHeaders, "Should include rawHeaders in the response");

    const startIndex = headerIndex(body.rawHeaders, "X-Start");
    const middleIndex = headerIndex(body.rawHeaders, "X-Middle");
    const endIndex = headerIndex(body.rawHeaders, "X-End");

    assert.ok(startIndex !== -1, "X-Start header should be present");
    assert.ok(middleIndex !== -1, "X-Middle header should be present");
    assert.ok(endIndex !== -1, "X-End header should be present");
    assert.ok(startIndex < middleIndex, "X-Start should precede X-Middle");
    assert.ok(middleIndex < endIndex, "X-Middle should precede X-End");
  });

  test("should provide functional clone and text helpers", async () => {
    const response = await wreqFetch(httpUrl("/json"), {
      browser: "chrome_142",
      timeout: 10000,
    });

    const clone = response.clone();
    const original = await response.json();
    const cloneText = await clone.text();

    assert.ok(original, "json() should parse successfully");
    assert.ok(cloneText.length > 0, "clone text should return payload");
    assert.ok(response.bodyUsed, "original body should be consumed");
    assert.ok(clone.bodyUsed, "clone body should be consumed");
  });

  test("should reject aborted requests with AbortError", async () => {
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      async () => {
        await wreqFetch(httpUrl("/get"), {
          browser: "chrome_142",
          signal: controller.signal,
          timeout: 1000,
        });
      },
      (error: unknown) => error instanceof Error && error.name === "AbortError",
      "Should reject with AbortError",
    );
  });

  test("should work with custom Headers helper", () => {
    const headers = new Headers({
      "X-Test": "alpha",
    });

    headers.append("x-test", "beta");
    headers.set("X-Another", "value");

    const collected = Array.from(headers.entries());

    assert.strictEqual(headers.get("X-Test"), "alpha, beta", "append should concatenate values");
    assert.strictEqual(headers.get("x-another"), "value", "set should overwrite values");
    assert.ok(collected.length >= 2, "entries should iterate all headers");
  });

  test("should validate browser profiles in fetch", async () => {
    await assert.rejects(
      async () => {
        await wreqFetch(httpUrl("/get"), {
          browser: "nonexistent_browser" as BrowserProfile,
          timeout: 1000,
        });
      },
      (error: unknown) => error instanceof RequestError,
      "Should reject invalid browser profiles",
    );
  });

  test("should isolate cookies for default fetch calls", async () => {
    await wreqFetch(httpUrl("/cookies/set?ephemeral=on"), {
      browser: "chrome_142",
      timeout: 5000,
    });

    const response = await wreqFetch(httpUrl("/cookies"), {
      browser: "chrome_142",
      timeout: 5000,
    });

    const body = await response.json<{ cookies: Record<string, string> }>();

    assert.ok(!body.cookies.ephemeral, "Ephemeral cookies should not persist across requests");
  });

  test("should isolate cookies between sessions", async () => {
    const sessionA = await createSession({ browser: "chrome_142" });
    const sessionB = await createSession({ browser: "chrome_142" });

    try {
      await sessionA.fetch(httpUrl("/cookies/set?flavor=alpha"), { timeout: 10000 });
      await sessionB.fetch(httpUrl("/cookies/set?flavor=beta"), { timeout: 10000 });

      const cookiesA = await sessionA.fetch(httpUrl("/cookies"), { timeout: 10000 });
      const cookiesB = await sessionB.fetch(httpUrl("/cookies"), { timeout: 10000 });

      const bodyA = await cookiesA.json<{ cookies: Record<string, string> }>();
      const bodyB = await cookiesB.json<{ cookies: Record<string, string> }>();

      assert.strictEqual(bodyA.cookies.flavor, "alpha", "Session A should keep its own cookies");
      assert.strictEqual(bodyB.cookies.flavor, "beta", "Session B should keep its own cookies");
    } finally {
      await sessionA.close();
      await sessionB.close();
    }
  });

  test("should clear session cookies on demand", async () => {
    const session = await createSession({ browser: "chrome_142" });

    try {
      await session.fetch(httpUrl("/cookies/set?token=123"), { timeout: 10000 });
      await session.clearCookies();

      const response = await session.fetch(httpUrl("/cookies"), { timeout: 10000 });
      const body = await response.json<{ cookies: Record<string, string> }>();

      assert.deepStrictEqual(body.cookies, {}, "Clearing the session should drop stored cookies");
    } finally {
      await session.close();
    }
  });

  test("withSession helper should dispose sessions automatically", async () => {
    let capturedSession: Session | undefined;

    await withSession(async (session) => {
      capturedSession = session;
      const response = await session.fetch(httpUrl("/get"), { timeout: 5000 });
      assert.strictEqual(response.status, 200);
    });

    const session = capturedSession;
    assert.ok(session, "withSession should provide a session instance");

    await assert.rejects(
      async () => {
        await session.fetch(httpUrl("/get"), { timeout: 5000 });
      },
      (error: unknown) => error instanceof RequestError,
      "Using a closed session should fail",
    );
  });
});
