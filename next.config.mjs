/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
]

const nextConfig = {
  // Type errors fail the build — no silent shipping of broken code.
  typescript: { ignoreBuildErrors: false },
  images: { unoptimized: true },
  // Keep the embedded Postgres (WASM) and node-postgres out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  poweredByHeader: false,
  // Dev only: let phones on the local network load dev assets from this Mac.
  allowedDevOrigins: ["172.20.10.3", "192.168.*.*", "10.*.*.*", "172.*.*.*"],
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
}

export default nextConfig
