import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Per-user rate limit for POST /api/coach, backed by Cloudflare's Workers
 * Rate Limiting binding (wrangler.jsonc: COACH_RATE_LIMITER, 20 requests per
 * 60s per user). Keyed by the authenticated user's id, so it can't be reset
 * by switching IPs/clients and doesn't depend on any client-side throttling.
 *
 * Fails open (allows the request) if the binding is missing or throws — an
 * infra hiccup here should degrade to "unlimited" rather than take down the
 * AI Coach outright. Logged loudly so a real misconfiguration is visible.
 */
export async function checkCoachRateLimit(userId: string): Promise<boolean> {
  try {
    const { env } = getCloudflareContext();
    const limiter = env.COACH_RATE_LIMITER;
    if (!limiter) return true;
    const { success } = await limiter.limit({ key: userId });
    return success;
  } catch (err) {
    console.error("[coach rate limit] check failed, allowing request:", err);
    return true;
  }
}
