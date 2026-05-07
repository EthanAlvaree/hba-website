import type { NextConfig } from "next";

// The signatures.highbluffacademy.com subdomain is served from the same Vercel
// project as the main site. Static assets live under public/email-signatures/
// and the rewrites below map every request on that hostname onto that folder
// (so the user-facing URL stays clean: e.g. signatures.highbluffacademy.com/
// instead of /email-signatures/index.html).
const SIGNATURES_HOST = "signatures.highbluffacademy.com";

const nextConfig: NextConfig = {
  async rewrites() {
    // beforeFiles, not afterFiles: the Next.js homepage at "/" would
    // otherwise win over the rewrite for the subdomain root.
    //
    // The /:path+ rule must come *before* the / rule. With the order
    // reversed the / rewrite gets shadowed and the root returns 404.
    return {
      beforeFiles: [
        {
          source: "/:path+",
          has: [{ type: "host", value: SIGNATURES_HOST }],
          destination: "/email-signatures/:path+",
        },
        {
          source: "/",
          has: [{ type: "host", value: SIGNATURES_HOST }],
          destination: "/email-signatures/index.html",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
