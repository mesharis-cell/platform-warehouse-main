"use client";

/**
 * React Query hooks for scanning operations
 * Phase 11: QR Code Scanning & Inventory Tracking
 */

import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import type {
    CompleteOutboundScanResponse,
    GetAssetScanHistoryResponse,
    GetScanEventsResponse,
    OutboundScanResponse,
    UploadTruckPhotosResponse,
    APIOutboundProgressResponse,
} from "@/types/scanning";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================================
// Outbound Scanning Functions
// ============================================================

const getOutboundScanProgress = async (orderId: string): Promise<APIOutboundProgressResponse> => {
    try {
        const response = await apiClient.get<APIOutboundProgressResponse>(
            `/operations/v1/scanning/outbound/${orderId}/progress`
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const scanOutboundItem = async (data: {
    orderId: string;
    qrCode: string;
    quantity?: number;
}): Promise<OutboundScanResponse> => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/outbound/${data.orderId}/scan`,
            {
                qr_code: data.qrCode,
                quantity: data.quantity,
            }
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const uploadTruckPhotos = async (data: {
    orderId: string;
    photos: string[];
    note?: string;
    assetIds?: string[];
    tripPhase?: "OUTBOUND" | "RETURN";
}): Promise<UploadTruckPhotosResponse> => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/outbound/${data.orderId}/truck-photos`,
            {
                media: data.photos.map((url) => ({ url })),
                note: data.note,
                asset_ids: data.assetIds || [],
                trip_phase: data.tripPhase || "OUTBOUND",
            }
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const completeOutboundScan = async (data: {
    orderId: string;
}): Promise<CompleteOutboundScanResponse> => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/outbound/${data.orderId}/complete`,
            {}
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

// ============================================================
// Outbound Scanning Hooks (Stateless)
// ============================================================

export function useOutboundScanProgress(orderId: string | null) {
    return useQuery({
        queryKey: ["outboundScanProgress", orderId],
        queryFn: () => getOutboundScanProgress(orderId!),
        enabled: !!orderId,
        refetchInterval: 3000, // Poll every 3 seconds for real-time updates
    });
}

export function useScanOutboundItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scanOutboundItem,
        onSuccess: (_, variables) => {
            // Invalidate progress query
            queryClient.invalidateQueries({
                queryKey: ["outboundScanProgress", variables.orderId],
            });
        },
    });
}

export function useUploadTruckPhotos() {
    return useMutation({
        mutationFn: uploadTruckPhotos,
    });
}

export function useCompleteOutboundScan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: completeOutboundScan,
        onSuccess: (data) => {
            // Invalidate order details
            queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
            queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
            queryClient.invalidateQueries({
                queryKey: ["outboundScanProgress", data.orderId],
            });
        },
    });
}

// ============================================================
// Inbound Scanning Functions
// ============================================================

const getInboundScanProgress = async (orderId: string) => {
    try {
        const response = await apiClient.get(`/operations/v1/scanning/inbound/${orderId}/progress`);
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const scanInboundItem = async (data: {
    orderId: string;
    qrCode: string;
    condition: "GREEN" | "ORANGE" | "RED";
    notes?: string;
    latestReturnImages: string[];
    damageReportEntries?: Array<{ url: string; description?: string }>;
    refurbDaysEstimate?: number;
    discrepancyReason?: "BROKEN" | "LOST" | "OTHER";
    quantity?: number;
}) => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/inbound/${data.orderId}/scan`,
            {
                qr_code: data.qrCode,
                condition: data.condition,
                notes: data.notes,
                return_media: (data.latestReturnImages || []).map((url) => ({ url })),
                damage_media: (data.damageReportEntries || []).map((entry) => ({
                    url: entry.url,
                    note: entry.description,
                })),
                refurb_days_estimate: data.refurbDaysEstimate,
                discrepancy_reason: data.discrepancyReason,
                quantity: data.quantity,
            }
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const completeInboundScan = async (data: { orderId: string }) => {
    try {
        const response = await apiClient.post(
            `/operations/v1/scanning/inbound/${data.orderId}/complete`,
            {}
        );
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

// ============================================================
// Inbound Scanning Hooks (Stateless)
// ============================================================

export function useInboundScanProgress(orderId: string | null) {
    return useQuery({
        queryKey: ["inboundScanProgress", orderId],
        queryFn: () => getInboundScanProgress(orderId!),
        enabled: !!orderId,
        refetchInterval: 3000,
    });
}

export function useScanInboundItem() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: scanInboundItem,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["inboundScanProgress", variables.orderId],
            });
        },
    });
}

export function useCompleteInboundScan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: completeInboundScan,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
            queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
            queryClient.invalidateQueries({ queryKey: ["assets"] });
            queryClient.invalidateQueries({
                queryKey: ["inboundScanProgress", data.orderId],
            });
        },
    });
}

// ============================================================
// History & Inventory Functions
// ============================================================

const getOrderScanEvents = async (orderId: string): Promise<GetScanEventsResponse> => {
    try {
        const response = await apiClient.get(`/client/v1/order/${orderId}/scan-events`);
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

const getAssetScanHistory = async (assetId: string): Promise<GetAssetScanHistoryResponse> => {
    try {
        const response = await apiClient.get(`/operations/v1/asset/${assetId}/scan-history`);
        return response.data;
    } catch (error) {
        return throwApiError(error);
    }
};

// ============================================================
// Scan History Hooks
// ============================================================

export function useOrderScanEvents(orderId: string) {
    return useQuery({
        queryKey: ["orderScanEvents", orderId],
        queryFn: () => getOrderScanEvents(orderId),
        enabled: !!orderId,
    });
}

export function useAssetScanHistory(assetId: string) {
    return useQuery({
        queryKey: ["assetScanHistory", assetId],
        queryFn: () => getAssetScanHistory(assetId),
        enabled: !!assetId,
    });
}

// ============================================================
// Self-Pickup Scanning Hooks
// ============================================================

export function useSelfPickupHandoverProgress(selfPickupId: string | null) {
    return useQuery({
        queryKey: ["selfPickupHandoverProgress", selfPickupId],
        queryFn: async () => {
            const { data } = await apiClient.get(
                `/operations/v1/scanning/self-pickup-handover/${selfPickupId}/progress`
            );
            return data;
        },
        enabled: !!selfPickupId,
        refetchInterval: 3000,
    });
}

export function useScanSelfPickupHandoverItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            selfPickupId,
            ...body
        }: {
            selfPickupId: string;
            qr_code: string;
            quantity?: number;
            note?: string;
        }) => {
            const { data } = await apiClient.post(
                `/operations/v1/scanning/self-pickup-handover/${selfPickupId}/scan`,
                body
            );
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["selfPickupHandoverProgress"] }),
        onError: throwApiError,
    });
}

export function useCompleteSelfPickupHandover() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            selfPickupId,
            allow_partial,
            partial_reason,
            items,
        }: {
            selfPickupId: string;
            allow_partial?: boolean;
            partial_reason?: string;
            items?: Array<{ self_pickup_item_id: string; scanned_quantity: number }>;
        }) => {
            const body: Record<string, unknown> = {};
            if (allow_partial) body.allow_partial = true;
            if (partial_reason) body.partial_reason = partial_reason;
            if (items) body.items = items;
            const { data } = await apiClient.post(
                `/operations/v1/scanning/self-pickup-handover/${selfPickupId}/complete`,
                body
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["selfPickupHandoverProgress"] });
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
        },
        onError: throwApiError,
    });
}

// Mid-flow add item (F3). NO_COST pickups at CONFIRMED/READY_FOR_PICKUP only.
export function useAddSelfPickupItemMidflow() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            selfPickupId,
            asset_id,
            quantity,
            reason,
        }: {
            selfPickupId: string;
            asset_id: string;
            quantity: number;
            reason: string;
        }) => {
            const { data } = await apiClient.post(
                `/operations/v1/scanning/self-pickup-handover/${selfPickupId}/add-item`,
                { asset_id, quantity, reason }
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["selfPickupHandoverProgress"] });
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
        },
        onError: throwApiError,
    });
}

export function useSelfPickupReturnProgress(selfPickupId: string | null) {
    return useQuery({
        queryKey: ["selfPickupReturnProgress", selfPickupId],
        queryFn: async () => {
            const { data } = await apiClient.get(
                `/operations/v1/scanning/self-pickup-return/${selfPickupId}/progress`
            );
            return data;
        },
        enabled: !!selfPickupId,
        refetchInterval: 3000,
    });
}

export function useScanSelfPickupReturnItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            selfPickupId,
            ...body
        }: {
            selfPickupId: string;
            qr_code: string;
            condition: string;
            quantity?: number;
            notes?: string;
            return_media?: Array<{ url: string; note?: string }>;
            damage_media?: Array<{ url: string; note?: string }>;
            refurb_days_estimate?: number;
            discrepancy_reason?: "BROKEN" | "LOST" | "OTHER";
        }) => {
            const { data } = await apiClient.post(
                `/operations/v1/scanning/self-pickup-return/${selfPickupId}/scan`,
                body
            );
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["selfPickupReturnProgress"] }),
        onError: throwApiError,
    });
}

export function useCompleteSelfPickupReturn() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            selfPickupId,
            settlements,
        }: {
            selfPickupId: string;
            settlements?: any[];
        }) => {
            const { data } = await apiClient.post(
                `/operations/v1/scanning/self-pickup-return/${selfPickupId}/complete`,
                { settlements: settlements || [] }
            );
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["selfPickupReturnProgress"] });
            qc.invalidateQueries({ queryKey: ["self-pickups"] });
            qc.invalidateQueries({ queryKey: ["self-pickup"] });
        },
        onError: throwApiError,
    });
}
