import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: no R2-backed ISR cache. WorkoutMate's routes are almost
// entirely dynamic/user-scoped (see the route list in README's architecture
// section) rather than statically revalidated, so the default in-memory
// cache is sufficient for now — add an R2 incrementalCache override here
// later only if a specific route needs cross-deployment ISR persistence.
export default defineCloudflareConfig();
