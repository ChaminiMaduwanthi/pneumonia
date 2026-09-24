/** @type {import('next').NextConfig} */

// Where the PHP backend actually lives, as seen from the Next.js server process.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1";

const nextConfig = {
  // Serve the PHP backend through this same origin.
  //
  // The browser then only ever talks to one host, which means: no CORS, no mixed
  // content, and a single HTTPS tunnel is enough to put the whole app (API,
  // uploaded X-rays, Grad-CAM images and PDF reports) on a phone. Apache still
  // serves everything — Next.js just proxies to it.
  async rewrites() {
    return [
      {
        source: "/pneumonia/backend/:path*",
        destination: `${BACKEND_ORIGIN}/pneumonia/backend/:path*`,
      },
    ];
  },
};

export default nextConfig;
