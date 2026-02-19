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
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
                    },
                    { key: "Pragma", value: "no-cache" },
                    { key: "Expires", value: "0" },
                    { key: "Surrogate-Control", value: "no-store" },
                ],
            },
        ];
    },
} satisfies NextConfig & {
    typescript?: { ignoreBuildErrors?: boolean };
};

export default nextConfig;
