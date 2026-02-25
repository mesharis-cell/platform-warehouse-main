"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Asset, AssetsDetails, AssetWithDetails, CreateAssetRequest } from "@/types/asset";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { useCompanyFilter } from "@/contexts/company-filter-context";

// Query keys
export const assetKeys = {
    all: ["assets"] as const,
    lists: () => [...assetKeys.all, "list"] as const,
    list: (params?: Record<string, string>) => [...assetKeys.lists(), params] as const,
    details: () => [...assetKeys.all, "detail"] as const,
    detail: (id: string) => [...assetKeys.details(), id] as const,
};

// Fetch assets list
async function fetchAssets(params?: Record<string, string>): Promise<{
    data: Asset[];
    meta: {
        total: number;
        limit: number;
        page: number;
        summary: { red_count: number; orange_count: number; green_count: number };
    };
}> {
    try {
        const cleanedParams = { ...(params || {}) };
        for (const [key, value] of Object.entries(cleanedParams)) {
            if (value === undefined || value === "" || value === "all" || value === "_all_") {
                delete cleanedParams[key];
            }
        }

        const searchParams = new URLSearchParams(cleanedParams);
        const response = await apiClient.get(`/operations/v1/asset?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Fetch single asset
async function fetchAsset(id: string): Promise<{ data: AssetsDetails }> {
    try {
        const response = await apiClient.get(`/operations/v1/asset/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Create asset
async function createAsset(data: CreateAssetRequest): Promise<Asset> {
    try {
        const response = await apiClient.post(`/operations/v1/asset`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Update asset
async function updateAsset(id: string, data: Partial<CreateAssetRequest>): Promise<Asset> {
    try {
        const response = await apiClient.patch(`/operations/v1/asset/${id}`, data);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Delete asset
async function deleteAsset(id: string): Promise<void> {
    try {
        const response = await apiClient.delete(`/operations/v1/asset/${id}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Upload image
async function uploadImage(
    formData: FormData
): Promise<{ data: { imageUrls: string[]; presignedUrl: string } }> {
    try {
        const response = await apiClient.post("/operations/v1/upload/images", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Generate QR code
async function generateQRCode(qrCode: string): Promise<{ qrCodeImage: string }> {
    try {
        const response = await apiClient.post("/operations/v1/asset/generate-qr-code", {
            qr_code: qrCode,
        });

        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

// Hooks
export function useAssets(params?: Record<string, string>) {
    const { selectedCompanyId } = useCompanyFilter();
    const effectiveParams = useMemo(() => {
        const nextParams = { ...(params || {}) };
        const hasExplicitCompany = nextParams.company_id !== undefined;
        if (!hasExplicitCompany && selectedCompanyId) {
            nextParams.company_id = selectedCompanyId;
        }
        return nextParams;
    }, [params, selectedCompanyId]);

    return useQuery({
        queryKey: assetKeys.list(effectiveParams),
        queryFn: () => fetchAssets(effectiveParams),
    });
}

// Search assets hook with enabled control for debounced searching
export function useSearchAssets(searchTerm: string, companyId?: string) {
    const { selectedCompanyId } = useCompanyFilter();
    const effectiveCompanyId =
        companyId !== undefined ? companyId || undefined : selectedCompanyId || undefined;
    const params = useMemo(() => {
        const nextParams: Record<string, string> = {};
        if (searchTerm) nextParams.search_term = searchTerm;
        if (effectiveCompanyId) nextParams.company_id = effectiveCompanyId;
        return nextParams;
    }, [searchTerm, effectiveCompanyId]);

    return useQuery({
        queryKey: [...assetKeys.lists(), "search", searchTerm, effectiveCompanyId] as const,
        queryFn: () => fetchAssets(params),
        enabled: !!searchTerm && searchTerm.length >= 2 && !!effectiveCompanyId,
        staleTime: 0,
    });
}

export function useAsset(id: string) {
    return useQuery({
        queryKey: assetKeys.detail(id),
        queryFn: () => fetchAsset(id),
        enabled: !!id,
    });
}

export function useCreateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
        },
    });
}

export function useUploadImage() {
    return useMutation({
        mutationFn: uploadImage,
    });
}

export function useGenerateQRCode() {
    return useMutation({
        mutationFn: generateQRCode,
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateAssetRequest> }) =>
            updateAsset(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
            queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.id) });
        },
    });
}

export function useDeleteAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
        },
    });
}

export function useAssetVersions(assetId: string | null) {
    return useQuery({
        queryKey: ["asset-versions", assetId],
        queryFn: async () => {
            if (!assetId) return [];
            const res = await apiClient.get(`/operations/v1/asset/${assetId}/versions`);
            return res.data?.data || [];
        },
        enabled: !!assetId,
    });
}
