"use client";

/**
 * Offline-Aware Scanning Hooks
 *
 * Wraps the existing scanning hooks with offline capability.
 * Queues scan events when offline and syncs when back online.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNetwork } from "@/providers/network-provider";
import { toast } from "sonner";
import {
    useOutboundScanProgress,
    useScanOutboundItem,
    useInboundScanProgress,
    useScanInboundItem,
    useCompleteOutboundScan,
    useCompleteInboundScan,
    useUploadTruckPhotos,
} from "./use-scanning";
import type { APIOutboundProgressResponse, APIInboundProgressResponse } from "@/types/scanning";

// ============================================================
// Offline-Aware Outbound Scanning
// ============================================================

export function useOfflineOutboundScanProgress(orderId: string | null) {
    const { network } = useNetwork();
    const onlineQuery = useOutboundScanProgress(orderId);

    // Query for cached progress when offline
    const cachedQuery = useQuery({
        queryKey: ["offlineScanProgress", "outbound", orderId],
        queryFn: async () => {
            const { getCachedScanProgress, getPendingScans } =
                await import("@/lib/offline/offline-storage");

            const cached = await getCachedScanProgress(orderId!);
            const pendingScans = await getPendingScans(orderId!);

            if (!cached) return null;

            // Merge pending scans with cached progress
            const mergedAssets = cached.data.assets.map((asset) => {
                const pendingForAsset = pendingScans.filter((s) => s.qrCode === asset.qrCode);
                const additionalScanned = pendingForAsset.reduce((sum, s) => sum + s.quantity, 0);
                const newScannedQty = asset.scannedQuantity + additionalScanned;

                return {
                    asset_id: asset.assetId,
                    asset_name: asset.assetName,
                    qr_code: asset.qrCode,
                    tracking_method: asset.trackingMethod,
                    required_quantity: asset.requiredQuantity,
                    scanned_quantity: newScannedQty,
                    is_complete: newScannedQty >= asset.requiredQuantity,
                };
            });

            const totalScanned =
                cached.data.itemsScanned + pendingScans.reduce((sum, s) => sum + s.quantity, 0);

            return {
                data: {
                    order_id: cached.orderId,
                    order_status: cached.data.orderStatus,
                    total_items: cached.data.totalItems,
                    items_scanned: totalScanned,
                    percent_complete: Math.min(
                        100,
                        Math.round((totalScanned / cached.data.totalItems) * 100)
                    ),
                    assets: mergedAssets,
                },
                message: "Cached data (offline)",
                success: true,
            } as APIOutboundProgressResponse;
        },
        enabled: !!orderId && !network.isOnline,
        staleTime: Infinity,
    });

    // Cache successful online responses
    const queryClient = useQueryClient();

    if (onlineQuery.data && network.isOnline) {
        // Cache the progress data for offline use
        const data = onlineQuery.data as unknown as APIOutboundProgressResponse;

        import("@/lib/offline/offline-storage").then(({ cacheScanProgress }) => {
            cacheScanProgress(orderId!, "OUTBOUND", {
                orderStatus: data.data.order_status,
                totalItems: data.data.total_items,
                itemsScanned: data.data.items_scanned,
                percentComplete: data.data.percent_complete,
                assets: data.data.assets.map((a) => ({
                    assetId: a.asset_id,
                    assetName: a.asset_name,
                    qrCode: a.qr_code,
                    trackingMethod: a.tracking_method,
                    requiredQuantity: a.required_quantity,
                    scannedQuantity: a.scanned_quantity,
                    isComplete: a.is_complete,
                })),
            });
        });
    }

    // Return cached data when offline, online data when online
    return network.isOnline
        ? onlineQuery
        : {
              ...cachedQuery,
              isLoading: cachedQuery.isLoading,
          };
}

export function useOfflineScanOutboundItem() {
    const { network, triggerSync } = useNetwork();
    const onlineMutation = useScanOutboundItem();
    const queryClient = useQueryClient();

    const offlineMutation = useMutation({
        mutationFn: async (data: { orderId: string; qrCode: string; quantity?: number }) => {
            const { savePendingScan, getCachedScanProgress } =
                await import("@/lib/offline/offline-storage");

            // Get cached progress to find asset info
            const cached = await getCachedScanProgress(data.orderId);
            const asset = cached?.data.assets.find((a) => a.qrCode === data.qrCode);

            if (!asset) {
                throw new Error("Asset not found in cached data");
            }

            // Save offline scan
            await savePendingScan({
                orderId: data.orderId,
                scanType: "OUTBOUND",
                qrCode: data.qrCode,
                quantity: data.quantity || 1,
            });

            // Return mock response for optimistic UI update
            return {
                data: {
                    asset: {
                        asset_id: asset.assetId,
                        asset_name: asset.assetName,
                        tracking_method: asset.trackingMethod,
                        scanned_quantity: asset.scannedQuantity + (data.quantity || 1),
                        required_quantity: asset.requiredQuantity,
                        remaining_quantity:
                            asset.requiredQuantity - asset.scannedQuantity - (data.quantity || 1),
                    },
                    progress: {
                        total_items: cached.data.totalItems,
                        items_scanned: cached.data.itemsScanned + (data.quantity || 1),
                        percent_complete: Math.min(
                            100,
                            cached.data.percentComplete +
                                Math.round(((data.quantity || 1) / cached.data.totalItems) * 100)
                        ),
                    },
                },
                success: true,
                offline: true,
            };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["offlineScanProgress", "outbound", variables.orderId],
            });

            toast.success("Scan saved offline", {
                description: "Will sync when back online",
            });
        },
        onError: (error) => {
            toast.error("Failed to save scan offline", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        },
    });

    // Use online mutation when online, offline when offline
    if (network.isOnline) {
        return onlineMutation;
    }

    return offlineMutation;
}

// ============================================================
// Offline-Aware Inbound Scanning
// ============================================================

export function useOfflineInboundScanProgress(orderId: string | null) {
    const { network } = useNetwork();
    const onlineQuery = useInboundScanProgress(orderId);

    const cachedQuery = useQuery({
        queryKey: ["offlineScanProgress", "inbound", orderId],
        queryFn: async () => {
            const { getCachedScanProgress, getPendingScans } =
                await import("@/lib/offline/offline-storage");

            const cached = await getCachedScanProgress(orderId!);
            const pendingScans = await getPendingScans(orderId!);

            if (!cached) return null;

            // Merge pending scans
            const mergedAssets = cached.data.assets.map((asset) => {
                const pendingForAsset = pendingScans.filter((s) => s.qrCode === asset.qrCode);
                const additionalScanned = pendingForAsset.reduce((sum, s) => sum + s.quantity, 0);
                const newScannedQty = asset.scannedQuantity + additionalScanned;

                return {
                    asset_id: asset.assetId,
                    asset_name: asset.assetName,
                    qr_code: asset.qrCode,
                    tracking_method: asset.trackingMethod,
                    required_quantity: asset.requiredQuantity,
                    scanned_quantity: newScannedQty,
                    is_complete: newScannedQty >= asset.requiredQuantity,
                };
            });

            const totalScanned =
                cached.data.itemsScanned + pendingScans.reduce((sum, s) => sum + s.quantity, 0);

            return {
                data: {
                    order_id: cached.orderId,
                    order_status: cached.data.orderStatus,
                    total_items: cached.data.totalItems,
                    items_scanned: totalScanned,
                    percent_complete: Math.min(
                        100,
                        Math.round((totalScanned / cached.data.totalItems) * 100)
                    ),
                    assets: mergedAssets,
                },
                message: "Cached data (offline)",
                success: true,
            } as APIInboundProgressResponse;
        },
        enabled: !!orderId && !network.isOnline,
        staleTime: Infinity,
    });

    // Cache successful online responses
    if (onlineQuery.data && network.isOnline) {
        const data = onlineQuery.data as unknown as APIInboundProgressResponse;

        import("@/lib/offline/offline-storage").then(({ cacheScanProgress }) => {
            cacheScanProgress(orderId!, "INBOUND", {
                orderStatus: data.data.order_status,
                totalItems: data.data.total_items,
                itemsScanned: data.data.items_scanned,
                percentComplete: data.data.percent_complete,
                assets: data.data.assets.map((a) => ({
                    assetId: a.asset_id,
                    assetName: a.asset_name,
                    qrCode: a.qr_code,
                    trackingMethod: a.tracking_method,
                    requiredQuantity: a.required_quantity,
                    scannedQuantity: a.scanned_quantity,
                    isComplete: a.is_complete,
                })),
            });
        });
    }

    return network.isOnline
        ? onlineQuery
        : {
              ...cachedQuery,
              isLoading: cachedQuery.isLoading,
          };
}

export function useOfflineScanInboundItem() {
    const { network } = useNetwork();
    const onlineMutation = useScanInboundItem();
    const queryClient = useQueryClient();

    const offlineMutation = useMutation({
        mutationFn: async (data: {
            orderId: string;
            qrCode: string;
            condition: "GREEN" | "ORANGE" | "RED";
            notes?: string;
            photos?: string[];
            refurbDaysEstimate?: number;
            discrepancyReason?: "BROKEN" | "LOST" | "OTHER";
            quantity?: number;
        }) => {
            const { savePendingScan, saveOfflinePhoto, getCachedScanProgress } =
                await import("@/lib/offline/offline-storage");

            // Save photos if provided
            const photoIds: string[] = [];
            if (data.photos && data.photos.length > 0) {
                for (const photo of data.photos) {
                    const savedPhoto = await saveOfflinePhoto(
                        data.orderId,
                        photo,
                        data.condition === "RED" ? "damage" : "condition"
                    );
                    if (savedPhoto) {
                        photoIds.push(savedPhoto.id);
                    }
                }
            }

            // Save offline scan
            await savePendingScan({
                orderId: data.orderId,
                scanType: "INBOUND",
                qrCode: data.qrCode,
                quantity: data.quantity || 1,
                condition: data.condition,
                notes: data.notes,
                photoIds,
                refurbDaysEstimate: data.refurbDaysEstimate,
                discrepancyReason: data.discrepancyReason,
            });

            // Get cached progress for response
            const cached = await getCachedScanProgress(data.orderId);
            const asset = cached?.data.assets.find((a) => a.qrCode === data.qrCode);

            return {
                data: {
                    asset: {
                        asset_id: asset?.assetId || "",
                        asset_name: asset?.assetName || "",
                        tracking_method: asset?.trackingMethod || "INDIVIDUAL",
                        scanned_quantity: (asset?.scannedQuantity || 0) + (data.quantity || 1),
                        expected_quantity: asset?.requiredQuantity || 0,
                        remaining_quantity:
                            (asset?.requiredQuantity || 0) -
                            (asset?.scannedQuantity || 0) -
                            (data.quantity || 1),
                        condition: data.condition,
                        status: data.condition === "RED" ? "IN_MAINTENANCE" : "AVAILABLE",
                    },
                    progress: {
                        total_items: cached?.data.totalItems || 0,
                        items_scanned: (cached?.data.itemsScanned || 0) + (data.quantity || 1),
                        percent_complete: Math.min(
                            100,
                            (cached?.data.percentComplete || 0) +
                                Math.round(
                                    ((data.quantity || 1) / (cached?.data.totalItems || 1)) * 100
                                )
                        ),
                    },
                },
                success: true,
                offline: true,
            };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["offlineScanProgress", "inbound", variables.orderId],
            });

            toast.success("Scan saved offline", {
                description: "Will sync when back online",
            });
        },
        onError: (error) => {
            toast.error("Failed to save scan offline", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        },
    });

    return network.isOnline ? onlineMutation : offlineMutation;
}

// ============================================================
// Offline-Aware Complete Scan
// ============================================================

export function useOfflineCompleteOutboundScan() {
    const { network } = useNetwork();
    const onlineMutation = useCompleteOutboundScan();

    const offlineMutation = useMutation({
        mutationFn: async (data: { orderId: string }) => {
            const { queueCompleteScan } = await import("@/lib/offline/sync-manager");
            await queueCompleteScan(data.orderId, "OUTBOUND");

            return {
                success: true,
                orderId: data.orderId,
                offline: true,
                newStatus: "PENDING_SYNC",
            };
        },
        onSuccess: () => {
            toast.success("Scan completion queued", {
                description: "Will finalize when back online",
            });
        },
    });

    return network.isOnline ? onlineMutation : offlineMutation;
}

export function useOfflineCompleteInboundScan() {
    const { network } = useNetwork();
    const onlineMutation = useCompleteInboundScan();

    const offlineMutation = useMutation({
        mutationFn: async (data: { orderId: string }) => {
            const { queueCompleteScan } = await import("@/lib/offline/sync-manager");
            await queueCompleteScan(data.orderId, "INBOUND");

            return {
                success: true,
                orderId: data.orderId,
                offline: true,
                newStatus: "PENDING_SYNC",
            };
        },
        onSuccess: () => {
            toast.success("Scan completion queued", {
                description: "Will finalize when back online",
            });
        },
    });

    return network.isOnline ? onlineMutation : offlineMutation;
}

// ============================================================
// Offline-Aware Photo Upload
// ============================================================

export function useOfflineUploadTruckPhotos() {
    const { network } = useNetwork();
    const onlineMutation = useUploadTruckPhotos();

    const offlineMutation = useMutation({
        mutationFn: async (data: { orderId: string; photos: string[] }) => {
            const { saveOfflinePhoto } = await import("@/lib/offline/offline-storage");

            const uploadedPhotos: string[] = [];

            for (const photo of data.photos) {
                const saved = await saveOfflinePhoto(data.orderId, photo, "truck");
                if (saved) {
                    uploadedPhotos.push(saved.id);
                }
            }

            return {
                success: true,
                data: {
                    uploaded_photos: uploadedPhotos,
                },
                offline: true,
            };
        },
        onSuccess: (result) => {
            toast.success("Photos saved offline", {
                description: `${result.data.uploaded_photos.length} photo(s) will sync when online`,
            });
        },
    });

    return network.isOnline ? onlineMutation : offlineMutation;
}
