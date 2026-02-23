"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const COMPANY_FILTER_STORAGE_KEY = "kadence_selected_company_id";
const USER_STORAGE_KEY = "user";

interface CompanyFilterContextType {
    selectedCompanyId: string | null;
    setSelectedCompanyId: (companyId: string | null) => void;
    isHydrated: boolean;
}

const CompanyFilterContext = createContext<CompanyFilterContextType | undefined>(undefined);

const parseUserCompanyId = (): string | null => {
    if (typeof window === "undefined") return null;

    try {
        // eslint-disable-next-line creatr/no-browser-globals-in-ssr
        const rawUser = localStorage.getItem(USER_STORAGE_KEY);
        if (!rawUser) return null;

        const parsed = JSON.parse(rawUser);
        return typeof parsed?.company_id === "string" && parsed.company_id.length > 0
            ? parsed.company_id
            : null;
    } catch {
        return null;
    }
};

export function CompanyFilterProvider({ children }: { children: React.ReactNode }) {
    const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            // eslint-disable-next-line creatr/no-browser-globals-in-ssr
            const persisted = localStorage.getItem(COMPANY_FILTER_STORAGE_KEY);
            const normalizedPersisted =
                persisted === "all" || persisted === "_all_" ? null : persisted;

            if (normalizedPersisted && normalizedPersisted.length > 0) {
                setSelectedCompanyId(normalizedPersisted);
            } else {
                setSelectedCompanyId(parseUserCompanyId());
            }
        } finally {
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated || typeof window === "undefined") return;

        if (selectedCompanyId) {
            // eslint-disable-next-line creatr/no-browser-globals-in-ssr
            localStorage.setItem(COMPANY_FILTER_STORAGE_KEY, selectedCompanyId);
        } else {
            // eslint-disable-next-line creatr/no-browser-globals-in-ssr
            localStorage.removeItem(COMPANY_FILTER_STORAGE_KEY);
        }
    }, [selectedCompanyId, isHydrated]);

    const value = useMemo(
        () => ({
            selectedCompanyId,
            setSelectedCompanyId,
            isHydrated,
        }),
        [selectedCompanyId, isHydrated]
    );

    return <CompanyFilterContext.Provider value={value}>{children}</CompanyFilterContext.Provider>;
}

export function useCompanyFilter() {
    const context = useContext(CompanyFilterContext);
    if (!context) {
        throw new Error("useCompanyFilter must be used within a CompanyFilterProvider");
    }
    return context;
}
