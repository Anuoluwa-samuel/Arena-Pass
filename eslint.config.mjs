import nextConfig from "eslint-config-next"

const config = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**", "server/db/migrations/**", "storage/**", ".data/**", "test-results/**", "playwright-report/**"],
  },
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Generated shadcn/ui primitives: keep upstream code as-is, surface (not fail on) the new hook rules.
    files: ["components/ui/**"],
    rules: { "react-hooks/set-state-in-effect": "warn", "react-hooks/purity": "warn" },
  },
  {
    files: ["server/observability/logger.ts", "scripts/**", "tests/**"],
    rules: { "no-console": "off" },
  },
]

export default config
