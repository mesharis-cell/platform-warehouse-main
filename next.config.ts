import type { NextConfig } from 'next'
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
	dest: "public",
	cacheOnFrontEndNav: true,
	aggressiveFrontEndNavCaching: true,
	reloadOnOnline: true,
	disable: process.env.NODE_ENV === "development",
	workboxOptions: {
		disableDevLogs: true,
	},
	fallbacks: {
		document: "/offline",
	},
});

const nextConfig = {
	turbopack: {},
	trailingSlash: false,
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*',
				pathname: '**',
			},
		],
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	productionBrowserSourceMaps: true,
	serverExternalPackages: ['pdfkit'],
} satisfies NextConfig & {
	eslint?: { ignoreDuringBuilds?: boolean };
	typescript?: { ignoreBuildErrors?: boolean };
}

export default withPWA(nextConfig)

