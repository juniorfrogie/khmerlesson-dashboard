// Uses Node's built-in test runner (via `tsx --test`) rather than adding a
// new test-framework dependency for one focused test file — this repo has
// no test tooling installed at all today.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAllowedOrigins } from "../cors-origins";

test("production mode with no ALLOWED_ORIGINS keeps exactly the existing hard-coded prod origins", () => {
  assert.deepEqual(buildAllowedOrigins({ NODE_ENV: "production" }), [
    "https://cambodianlesson.netlify.app",
    "https://khmerlessons.app",
  ]);
});

test("development mode with no DEV_ORIGIN/ALLOWED_ORIGINS keeps exactly the existing localhost origins", () => {
  assert.deepEqual(buildAllowedOrigins({ NODE_ENV: "development" }), [
    "http://localhost:3000",
    "http://localhost:5001",
    "http://localhost:5000",
    "http://localhost:8081",
  ]);
});

test("development mode still appends DEV_ORIGIN (pre-existing behavior)", () => {
  const result = buildAllowedOrigins({ NODE_ENV: "development", DEV_ORIGIN: "http://192.168.1.5:8081" });
  assert.ok(result.includes("http://192.168.1.5:8081"));
});

test("ALLOWED_ORIGINS is appended in production — the actual staging fix", () => {
  const result = buildAllowedOrigins({
    NODE_ENV: "production", // DigitalOcean staging runs with NODE_ENV=production
    ALLOWED_ORIGINS: "https://staging.khmerlessons.app",
  });
  assert.ok(result.includes("https://staging.khmerlessons.app"));
  assert.ok(result.includes("https://cambodianlesson.netlify.app"));
  assert.ok(result.includes("https://khmerlessons.app"));
});

test("ALLOWED_ORIGINS is appended in development too", () => {
  const result = buildAllowedOrigins({ NODE_ENV: "development", ALLOWED_ORIGINS: "https://extra-dev.example.com" });
  assert.ok(result.includes("https://extra-dev.example.com"));
  assert.ok(result.includes("http://localhost:3000")); // existing dev origins preserved
});

test("ALLOWED_ORIGINS trims whitespace and drops empty entries across multiple comma-separated values", () => {
  const result = buildAllowedOrigins({
    NODE_ENV: "production",
    ALLOWED_ORIGINS: " https://a.example.com ,, https://b.example.com,",
  });
  assert.ok(result.includes("https://a.example.com"));
  assert.ok(result.includes("https://b.example.com"));
  assert.equal(result.filter((o) => o === "").length, 0);
});

test("a wildcard in ALLOWED_ORIGINS is never honored (credentials: true forbids it)", () => {
  const result = buildAllowedOrigins({ NODE_ENV: "production", ALLOWED_ORIGINS: "*,https://ok.example.com" });
  assert.ok(!result.includes("*"));
  assert.ok(result.includes("https://ok.example.com"));
});

test("an unset NODE_ENV falls back to the production allow-list (matches the pre-existing ternary's default)", () => {
  assert.deepEqual(buildAllowedOrigins({}), [
    "https://cambodianlesson.netlify.app",
    "https://khmerlessons.app",
  ]);
});
