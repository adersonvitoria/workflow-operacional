/**
 * Cabeçalhos de segurança aplicados a todas as rotas.
 *
 * A CSP permite 'unsafe-inline'/'unsafe-eval' em script-src porque o Next 14
 * (App Router) injeta scripts inline de hidratação sem nonce nesta versão;
 * mesmo assim ela restringe origens externas, bloqueia plugins e impede que a
 * aplicação seja embutida em iframes de terceiros.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tiles.mapbox.com https://api.mapbox.com",
  "font-src 'self' data:",
  // API própria + Mapbox (mapa do Calendário). A OpenAI é chamada no servidor.
  "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com",
  // Mapbox GL cria workers a partir de blob:.
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // não anuncia o framework
  // A pasta-pai tem outro lockfile; fixa a raiz para o Turbopack não inferir errado.
  turbopack: { root: import.meta.dirname },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
