import nextConfig from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  { ignores: [".next/**", ".open-next/**", ".wrangler/**", "node_modules/**", "coverage/**", "next-env.d.ts", "cloudflare-env.d.ts"] },
  ...nextConfig,
];

export default config;
