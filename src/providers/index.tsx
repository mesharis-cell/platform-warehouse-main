"use client";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PlatformProvider } from "@/contexts/platform-context";
import { AuthProvider } from "@/contexts/user-context";
import { NetworkProvider } from "@/providers/network-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute
                        gcTime: 5 * 60 * 1000, // 5 minutes
                        retry: 1,
                        refetchOnWindowFocus: false,
                        // Enable network-aware retries
                        networkMode: "offlineFirst",
                    },
                    mutations: {
                        networkMode: "offlineFirst",
                    },
                },
            })
    );

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
                            <NetworkProvider>
                                <NextTopLoader
                                    easing="ease"
                                    showSpinner={false}
                                    color="var(--primary)"
                                />
                                {children}
                                <Toaster position="top-center" richColors />
                            </NetworkProvider>
                        </ThemeProvider>
                    </QueryClientProvider>
                </AuthProvider>
            </PlatformProvider>
        </>
    );
}
