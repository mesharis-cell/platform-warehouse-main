import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from "@/providers";
import { ServiceWorkerRegister } from "@/components/sw-register";

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	themeColor: [
		{ media: '(prefers-color-scheme: light)', color: '#ffffff' },
		{ media: '(prefers-color-scheme: dark)', color: '#000000' },
	],
}

// Update this
export const metadata: Metadata = {
	title: {
		default: 'Logistic PMG',
		template: '%s | Logistic PMG',
	},
	description: 'Logistic PMG - Asset Management Platform',
	applicationName: 'Logistic PMG',
	keywords: ['logistics', 'asset management', 'inventory', 'tracking'],
	authors: [{ name: 'PMG Team' }],
	creator: 'PMG Team',
	publisher: 'PMG Team',
	icons: {
		icon: [
			{ url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
			{ url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
			{ url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
		],
		apple: [
			{
				url: '/apple-touch-icon.png',
				sizes: '180x180',
				type: 'image/png',
			},
		],
	},
	manifest: '/site.webmanifest',
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: 'Logistic PMG',
	},
	formatDetection: {
		telephone: false,
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<head>
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<ServiceWorkerRegister />
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	)
}

