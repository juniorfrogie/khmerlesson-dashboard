// Builds the CORS allow-list used by server/routes.ts.
//
// Background: NODE_ENV alone can't distinguish "staging" from "production" —
// DigitalOcean's staging deployment runs with NODE_ENV=production (like
// prod), so the old dev/prod ternary always rejected the staging origin
// regardless of DEV_ORIGIN (which only applied in the "development" branch).
// ALLOWED_ORIGINS is environment-driven and additive in BOTH branches
// specifically so a per-deployment origin (staging today, others later) can
// be added without touching code or the hard-coded origin lists below.
export interface CorsOriginEnv {
  NODE_ENV?: string;
  DEV_ORIGIN?: string;
  ALLOWED_ORIGINS?: string;
}

const PRODUCTION_ORIGINS = ["https://cambodianlesson.netlify.app", "https://khmerlessons.app"];
const DEV_ORIGINS = ["http://localhost:3000", "http://localhost:5001", "http://localhost:5000", "http://localhost:8081"];

// Comma-separated, trims whitespace, drops empty entries. `*` is dropped
// rather than honored — cors' `credentials: true` forbids a wildcard origin
// (browsers reject the combination outright), so silently admitting one here
// would produce a confusing runtime CORS failure instead of a clear one.
function parseAllowedOriginsEnv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== "*");
}

export function buildAllowedOrigins(env: CorsOriginEnv): string[] {
  const base =
    env.NODE_ENV === "development"
      ? [...DEV_ORIGINS, ...(env.DEV_ORIGIN ? [env.DEV_ORIGIN] : [])]
      : PRODUCTION_ORIGINS;
  return [...base, ...parseAllowedOriginsEnv(env.ALLOWED_ORIGINS)];
}
