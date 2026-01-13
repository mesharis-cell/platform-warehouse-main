import type { NextConfig } from 'next'
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
	dest: "public",
	cacheOnFrontEndNav: true,
	aggressiveFrontEndNavCaching: true,
	reloadOnOnline: true,
	disable: process.env.NODE_ENV === "development",
	register: true,
	workboxOptions: {
		disableDevLogs: true,
		// Runtime caching for API routes
		runtimeCaching: [
			{
				// Cache scanning progress API for offline access
				urlPattern: /^https?:\/\/.*\/operations\/v1\/scanning\/.*/i,
				handler: 'NetworkFirst',
				options: {
					cacheName: 'scanning-api-cache',
					expiration: {
						maxEntries: 50,
						maxAgeSeconds: 24 * 60 * 60, // 24 hours
					},
					networkTimeoutSeconds: 10,
				},
			},
			{
				// Cache order API for offline viewing
				urlPattern: /^https?:\/\/.*\/client\/v1\/order.*/i,
				handler: 'NetworkFirst',
				options: {
					cacheName: 'orders-api-cache',
					expiration: {
						maxEntries: 100,
						maxAgeSeconds: 24 * 60 * 60, // 24 hours
					},
					networkTimeoutSeconds: 10,
				},
			},
			{
				// Cache static assets with StaleWhileRevalidate
				urlPattern: /\.(?:js|css|woff2?|ttf|eot)$/i,
				handler: 'StaleWhileRevalidate',
				options: {
					cacheName: 'static-resources',
					expiration: {
						maxEntries: 100,
						maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
					},
				},
			},
			{
				// Cache images
				urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
				handler: 'CacheFirst',
				options: {
					cacheName: 'image-cache',
					expiration: {
						maxEntries: 200,
						maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
					},
				},
			},
		],
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

