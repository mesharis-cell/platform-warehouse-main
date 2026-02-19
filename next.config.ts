import type { NextConfig } from "next";

const nextConfig = {
    trailingSlash: false,
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*",
                pathname: "**",
            },
        ],
    },
    // Note: eslint config moved to eslint.config.mjs in Next.js 16
    typescript: {
        ignoreBuildErrors: true,
    },
    productionBrowserSourceMaps: true,
    serverExternalPackages: ["pdfkit"],
} satisfies NextConfig & {
    typescript?: { ignoreBuildErrors?: boolean };
};

export default nextConfig;
