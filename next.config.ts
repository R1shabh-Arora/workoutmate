import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Makes Cloudflare bindings (used by wrangler.jsonc's WORKER_SELF_REFERENCE,
// and any future KV/R2/D1 bindings) available to Server Actions and Route
// Handlers when running `next dev` — production uses the real Workers runtime.
// Must stay dev-only: `next build` evaluates this config from several
// parallel build workers, and calling it unconditionally starts a miniflare/
// workerd instance per worker, all racing to open the same local SQLite
// state file (SQLITE_BUSY / SQLITE_CANTOPEN — fatal, not a Windows-only bug).
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
