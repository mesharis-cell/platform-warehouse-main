"use client";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PlatformProvider } from "@/contexts/platform-context";
import { AuthProvider } from "@/contexts/user-context";
import { CompanyFilterProvider } from "@/contexts/company-filter-context";

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 0,
                        gcTime: 60 * 1000,
                        retry: 1,
                        networkMode: "online",
                        refetchOnWindowFocus: true,
                        refetchOnReconnect: true,
                        refetchOnMount: "always",
                    },
                },
            })
    );

    return (
        <>
            <PlatformProvider>
                <AuthProvider>
                    <CompanyFilterProvider>
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
                    </CompanyFilterProvider>
                </AuthProvider>
            </PlatformProvider>
        </>
    );
}
