import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/providers";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { headers } from "next/headers";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ],
};

export async function generateMetadata(): Promise<Metadata> {
    try {
        const headersList = await headers();
        const host = headersList.get("host") || "";

        // Pass the host to your backend so it can identify the tenant
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/context`, {
            headers: {
                "x-forwarded-host": host,
            },
            cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to fetch context");

        const data = await res.json();

        return {
            title: {
                default: `${data.data.platform_name || "Logistic"}`,
                template: "%s | Logistic",
            },
            description: "Logistic Platform - Asset Management Platform",
            applicationName: "Logistic Platform",
            keywords: ["logistics", "asset management", "inventory", "tracking"],
            authors: [{ name: "Platform Team" }],
            creator: "Platform Team",
            publisher: "Platform Team",
            icons: {
                icon: [
                    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
                    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
                    { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
                ],
                apple: [
                    {
                        url: "/apple-touch-icon.png",
                        sizes: "180x180",
                        type: "image/png",
                    },
                ],
            },
            manifest: "/site.webmanifest",
            appleWebApp: {
                capable: true,
                statusBarStyle: "default",
                title: `${data.data.platform_name || "Logistic"}`,
            },
            formatDetection: {
                telephone: false,
            },
        };
    } catch (error) {
        // Fallback to static metadata
        return {
            title: {
                default: "Logistic",
                template: "%s | Logistic",
            },
            description: "Logistic - Asset Management Platform",
            applicationName: "Logistic",
            keywords: ["logistics", "asset management", "inventory", "tracking"],
            authors: [{ name: "Platform Team" }],
            creator: "Platform Team",
            publisher: "Platform Team",
            icons: {
                icon: [
                    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
                    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
                    { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
                ],
                apple: [
                    {
                        url: "/apple-touch-icon.png",
                        sizes: "180x180",
                        type: "image/png",
                    },
                ],
            },
            manifest: "/site.webmanifest",
            appleWebApp: {
                capable: true,
                statusBarStyle: "default",
                title: "Logistic",
            },
            formatDetection: {
                telephone: false,
            },
        };
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link rel="manifest" href="/site.webmanifest" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
            </head>
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ServiceWorkerRegister />
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
