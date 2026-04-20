"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";

export type AssetCategory = {
    id: string;
    platform_id: string;
    company_id: string | null;
    name: string;
    slug: string;
    color: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
};

export function useAssetCategories(companyId?: string, options?: { allScopes?: boolean }) {
    const allScopes = options?.allScopes === true;
    return useQuery({
        queryKey: ["asset-categories", companyId || "all", allScopes ? "all-scopes" : "scoped"],
        queryFn: async (): Promise<{ data: AssetCategory[] }> => {
            const params = new URLSearchParams();
            if (allScopes) {
                params.set("all_scopes", "true");
            } else if (companyId) {
                params.set("company_id", companyId);
            }
            const qs = params.toString();
            const response = await apiClient.get(
                `/operations/v1/asset-category${qs ? `?${qs}` : ""}`
            );
            return response.data;
        },
    });
}
