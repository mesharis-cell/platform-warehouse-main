"use client";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PlatformProvider } from "@/contexts/platform-context";
import { AuthProvider } from "@/contexts/user-context";

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 0,
                        gcTime: 0,
                        retry: 1,
                        refetchOnWindowFocus: true,
                        refetchOnReconnect: true,
                        refetchOnMount: "always",
                    },
                },
            })
    );

    useEffect(() => {
        const disableOfflineArtifacts = async () => {
            if (typeof window === "undefined") return;

            try {
                if ("serviceWorker" in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    await Promise.all(
                        registrations.map((registration) => registration.unregister())
                    );
                }

                if ("caches" in window) {
                    const cacheKeys = await caches.keys();
                    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
                }
            } catch (error) {
                console.error("Failed to clear offline artifacts", error);
            }
        };

        void disableOfflineArtifacts();
    }, []);

    return (
        <>
            <PlatformProvider>
                <AuthProvider>
                    <QueryClientProvider client={queryClient}>
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="light"
                            enableSystem
                            disableTransitionOnChange
                        >
                            <NextTopLoader
                                easing="ease"
                                showSpinner={false}
                                color="var(--primary)"
                            />
                            {children}
                            <Toaster position="top-center" richColors />
                        </ThemeProvider>
                    </QueryClientProvider>
                </AuthProvider>
            </PlatformProvider>
        </>
    );
}
