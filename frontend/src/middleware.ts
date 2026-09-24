export { default } from "next-auth/middleware";

// "/admin" is intentionally not matched: that page renders its own admin login form
// for unauthenticated visitors instead of redirecting to /login. It still checks the
// session server-side before rendering anything, and the admin APIs enforce the role.
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analyse/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/research/:path*",
  ],
};
