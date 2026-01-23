"use client";

/**
 * Network Provider Context
 *
 * Provides global network status and sync state to the entire app.
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { useNetworkStatus, type NetworkStatus } from "@/hooks/use-network-status";
import { toast } from "sonner";

export interface SyncStatus {
    isSyncing: boolean;
    pendingCount: number;
    lastSyncedAt: Date | null;
    failedCount: number;
    isInitialized: boolean;
}

export interface NetworkContextValue {
    network: NetworkStatus;
    sync: SyncStatus;
    triggerSync: () => Promise<void>;
    clearOfflineData: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

interface NetworkProviderProps {
    children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
    const network = useNetworkStatus();

    const [sync, setSync] = useState<SyncStatus>({
        isSyncing: false,
        pendingCount: 0,
        lastSyncedAt: null,
        failedCount: 0,
        isInitialized: false,
    });

    const [wasOffline, setWasOffline] = useState(false);

    // Update pending count from storage
    const updatePendingCount = useCallback(async () => {
        try {
            const { getSyncQueueCount } = await import("@/lib/offline/offline-storage");
            const count = await getSyncQueueCount();

            setSync((prev) => ({
                ...prev,
                pendingCount: count,
                isInitialized: true,
            }));
        } catch (error) {
            console.error("Failed to get sync queue count:", error);
        }
    }, []);

    // Trigger manual sync
    const triggerSync = useCallback(async () => {
        if (sync.isSyncing || !network.isOnline) {
            return;
        }

        setSync((prev) => ({ ...prev, isSyncing: true }));

        try {
            const { processSyncQueue } = await import("@/lib/offline/sync-manager");
            const result = await processSyncQueue();

            setSync((prev) => ({
                ...prev,
                isSyncing: false,
                lastSyncedAt: new Date(),
                pendingCount: result.remainingCount,
                failedCount: result.failedCount,
            }));

            if (result.syncedCount > 0) {
                toast.success("Sync complete", {
                    description: `${result.syncedCount} item(s) synced successfully`,
                });
            }
        } catch (error) {
            console.error("Sync failed:", error);
            setSync((prev) => ({ ...prev, isSyncing: false }));

            toast.error("Sync failed", {
                description: "Will retry automatically when connection improves",
            });
        }
    }, [sync.isSyncing, network.isOnline]);

    // Clear all offline data
    const clearOfflineData = useCallback(async () => {
        try {
            const { clearAllOfflineData } = await import("@/lib/offline/offline-storage");
            await clearAllOfflineData();

            setSync((prev) => ({
                ...prev,
                pendingCount: 0,
                failedCount: 0,
            }));

            toast.success("Offline data cleared");
        } catch (error) {
            console.error("Failed to clear offline data:", error);
            toast.error("Failed to clear offline data");
        }
    }, []);

    // Initialize and poll for pending count
    useEffect(() => {
        updatePendingCount();

        // Poll every 10 seconds
        const interval = setInterval(updatePendingCount, 10000);

        return () => clearInterval(interval);
    }, [updatePendingCount]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (!network.isOnline) {
            setWasOffline(true);
            return;
        }

        if (wasOffline && network.isOnline && sync.pendingCount > 0) {
            toast.info("Back online", {
                description: `Syncing ${sync.pendingCount} pending item(s)...`,
            });

            // Delay sync slightly to ensure connection is stable
            const timer = setTimeout(() => {
                triggerSync();
            }, 2000);

            setWasOffline(false);
            return () => clearTimeout(timer);
        }
    }, [network.isOnline, wasOffline, sync.pendingCount, triggerSync]);

    // Show offline toast
    useEffect(() => {
        if (!network.isOnline) {
            toast.warning("You are offline", {
                description: "Changes will be saved locally and synced when online",
                duration: 5000,
            });
        }
    }, [network.isOnline]);

    const value: NetworkContextValue = {
        network,
        sync,
        triggerSync,
        clearOfflineData,
    };

    return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
    const context = useContext(NetworkContext);

    if (!context) {
        throw new Error("useNetwork must be used within NetworkProvider");
    }

    return context;
}

// Convenience hooks
export function useSyncStatus() {
    const { sync, triggerSync } = useNetwork();
    return { ...sync, triggerSync };
}
