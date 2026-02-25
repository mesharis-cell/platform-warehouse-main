"use client";

// Phase 4: Collections React Query Hooks

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
    Collection,
    CollectionWithDetails,
    CollectionListParams,
    CreateCollectionRequest,
    UpdateCollectionRequest,
    AddCollectionItemRequest,
    UpdateCollectionItemRequest,
    CollectionAvailabilityResponse,
} from "@/types/collection";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { useCompanyFilter } from "@/contexts/company-filter-context";

// ========================================
// Collection Query Hooks
// ========================================

export function useCollections(params: CollectionListParams = {}) {
    const { selectedCompanyId } = useCompanyFilter();
    const hasExplicitCompany = params.company_id !== undefined;
    const effectiveParams = useMemo(
        () => ({
            ...params,
            company_id: hasExplicitCompany
                ? params.company_id || undefined
                : selectedCompanyId || undefined,
        }),
        [params, hasExplicitCompany, selectedCompanyId]
    );

    return useQuery({
        queryKey: ["collections", effectiveParams],
        queryFn: async () => {
            try {
                const queryParams = new URLSearchParams();

                if (effectiveParams.company_id && effectiveParams.company_id !== "_all_")
                    queryParams.set("company_id", effectiveParams.company_id);
                if (effectiveParams.brand_id && effectiveParams.brand_id !== "_all_")
                    queryParams.set("brand_id", effectiveParams.brand_id);
                if (effectiveParams.category) queryParams.set("category", effectiveParams.category);
                if (effectiveParams.search_term)
                    queryParams.set("search_term", effectiveParams.search_term);
                if (effectiveParams.includeDeleted) queryParams.set("includeDeleted", "true");
                if (effectiveParams.limit)
                    queryParams.set("limit", effectiveParams.limit.toString());
                if (effectiveParams.offset)
                    queryParams.set("offset", effectiveParams.offset.toString());

                const response = await apiClient.get("/operations/v1/collection", {
                    params: queryParams,
                });

                return response.data;
            } catch (error) {
                console.error("Failed to fetch collections:", error);
                throw new Error("Failed to fetch collections");
            }
        },
        staleTime: 0,
    });
}

export function useCollection(id: string | undefined) {
    return useQuery({
        queryKey: ["collections", id],
        queryFn: async () => {
            try {
                if (!id) throw new Error("Collection ID required");

                const response = await apiClient.get(`/operations/v1/collection/${id}`);

                return response.data;
            } catch (error) {
                console.error("Failed to fetch collection:", error);
                throw new Error("Failed to fetch collection");
            }
        },
        enabled: !!id,
        staleTime: 0,
    });
}

export function useCollectionAvailability(
    id: string | undefined,
    eventStartDate: string,
    eventEndDate: string
) {
    return useQuery({
        queryKey: ["collections", id, "availability", eventStartDate, eventEndDate],
        queryFn: async () => {
            try {
                if (!id) throw new Error("Collection ID required");

                const queryParams = new URLSearchParams({
                    event_start_date: eventStartDate,
                    event_end_date: eventEndDate,
                });

                const response = await apiClient.get(
                    `/operations/v1/collection/${id}/availability?${queryParams.toString()}`
                );

                return response.data;
            } catch (error) {
                console.error("Failed to fetch collection availability:", error);
                throw new Error("Failed to fetch collection availability");
            }
        },
        enabled: !!id && !!eventStartDate && !!eventEndDate,
        staleTime: 0,
    });
}

// ========================================
// Collection Mutation Hooks
// ========================================

export function useCreateCollection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateCollectionRequest) => {
            try {
                const response = await apiClient.post("/operations/v1/collection", data);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

export function useUpdateCollection(id: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateCollectionRequest) => {
            try {
                const response = await apiClient.patch(`/operations/v1/collection/${id}`, data);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
            queryClient.invalidateQueries({ queryKey: ["collections", id] });
        },
    });
}

export function useDeleteCollection() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const response = await apiClient.delete(`/operations/v1/collection/${id}`);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

// ========================================
// Collection Item Mutation Hooks
// ========================================

export function useAddCollectionItem(collectionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AddCollectionItemRequest) => {
            try {
                const response = await apiClient.post(
                    `/operations/v1/collection/${collectionId}/items`,
                    data
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

export function useUpdateCollectionItem(collectionId: string, itemId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateCollectionItemRequest) => {
            try {
                const response = await apiClient.put(
                    `/operations/v1/collection/${collectionId}/items/${itemId}`,
                    data
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
        },
    });
}

export function useRemoveCollectionItem(collectionId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (itemId: string) => {
            try {
                const response = await apiClient.delete(
                    `/operations/v1/collection/${collectionId}/items/${itemId}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        },
    });
}

// ========================================
// Collection Image Upload Hook
// ========================================

export function useUploadCollectionImages() {
    return useMutation({
        mutationFn: async (files: File[]) => {
            try {
                const formData = new FormData();

                files.forEach((file) => {
                    formData.append("images", file);
                });

                const response = await apiClient.post("/operations/v1/collection/images", formData);

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
    });
}
