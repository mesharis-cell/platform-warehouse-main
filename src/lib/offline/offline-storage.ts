/**
 * Offline Storage Service
 *
 * Core CRUD operations for IndexedDB offline storage.
 * Handles storage limit management and cleanup.
 */

import {
    getDB,
    generateLocalId,
    isExpired,
    STORAGE_LIMITS,
    type PendingOrder,
    type PendingScanEvent,
    type ScanProgressCache,
    type OfflinePhoto,
    type SyncQueueItem,
    type AuthToken,
    type OfflineMetadata,
} from "./db-schema";

// Re-export types needed by other modules
export type { SyncQueueItem } from "./db-schema";

// ============================================================
// Storage Statistics
// ============================================================

export async function getStorageStats(): Promise<OfflineMetadata> {
    const db = await getDB();

    let metadata = await db.get("metadata", "storage-stats");

    if (!metadata || Date.now() - metadata.lastCalculatedAt > 60000) {
        // Recalculate stats if older than 1 minute
        metadata = await calculateStorageStats();
    }

    return metadata;
}

async function calculateStorageStats(): Promise<OfflineMetadata> {
    const db = await getDB();

    const [orders, scans, photos] = await Promise.all([
        db.getAll("pendingOrders"),
        db.getAll("pendingScanEvents"),
        db.getAll("offlinePhotos"),
    ]);

    const totalSizeBytes =
        photos.reduce((sum, p) => sum + p.sizeBytes, 0) +
        estimateJsonSize(orders) +
        estimateJsonSize(scans);

    const metadata: OfflineMetadata = {
        id: "storage-stats",
        totalSizeBytes,
        orderCount: orders.filter((o) => o.status === "pending").length,
        scanCount: scans.filter((s) => s.status === "pending").length,
        photoCount: photos.filter((p) => p.status === "pending").length,
        lastSyncAt: null, // Will be updated by sync manager
        lastCalculatedAt: Date.now(),
    };

    await db.put("metadata", metadata);
    return metadata;
}

function estimateJsonSize(data: unknown): number {
    return new Blob([JSON.stringify(data)]).size;
}

export async function isStorageAvailable(additionalBytes: number = 0): Promise<boolean> {
    const stats = await getStorageStats();
    return stats.totalSizeBytes + additionalBytes < STORAGE_LIMITS.maxTotalBytes;
}

export async function isStorageWarning(): Promise<boolean> {
    const stats = await getStorageStats();
    return stats.totalSizeBytes > STORAGE_LIMITS.warningThresholdBytes;
}

// ============================================================
// Pending Orders Operations
// ============================================================

export async function savePendingOrder(
    orderData: PendingOrder["orderData"]
): Promise<PendingOrder> {
    const db = await getDB();
    const id = generateLocalId();

    const pendingOrder: PendingOrder = {
        id,
        localId: id,
        orderData,
        status: "pending",
        createdAt: Date.now(),
        retryCount: 0,
    };

    await db.put("pendingOrders", pendingOrder);

    // Add to sync queue
    await addToSyncQueue({
        type: "order",
        referenceId: id,
        endpoint: "/api/orders/submit-from-cart",
        method: "POST",
        payload: orderData,
        priority: 1, // High priority
    });

    return pendingOrder;
}

export async function getPendingOrders(): Promise<PendingOrder[]> {
    const db = await getDB();
    return db.getAllFromIndex("pendingOrders", "by-status", "pending");
}

export async function updateOrderStatus(
    id: string,
    status: PendingOrder["status"],
    errorMessage?: string
): Promise<void> {
    const db = await getDB();
    const order = await db.get("pendingOrders", id);

    if (order) {
        order.status = status;
        if (status === "synced") {
            order.syncedAt = Date.now();
        }
        if (errorMessage) {
            order.errorMessage = errorMessage;
            order.retryCount += 1;
        }
        await db.put("pendingOrders", order);
    }
}

export async function deleteSyncedOrders(): Promise<void> {
    const db = await getDB();
    const orders = await db.getAllFromIndex("pendingOrders", "by-status", "synced");

    const tx = db.transaction("pendingOrders", "readwrite");
    await Promise.all([...orders.map((o) => tx.store.delete(o.id)), tx.done]);
}

// ============================================================
// Pending Scan Events Operations
// ============================================================

export async function savePendingScan(
    scanData: Omit<PendingScanEvent, "id" | "localId" | "status" | "createdAt" | "retryCount">
): Promise<PendingScanEvent> {
    const db = await getDB();
    const id = generateLocalId();

    const pendingScan: PendingScanEvent = {
        ...scanData,
        id,
        localId: id,
        status: "pending",
        createdAt: Date.now(),
        retryCount: 0,
    };

    await db.put("pendingScanEvents", pendingScan);

    // Add to sync queue
    const endpoint =
        scanData.scanType === "OUTBOUND"
            ? `/operations/v1/scanning/outbound/${scanData.orderId}/scan`
            : `/operations/v1/scanning/inbound/${scanData.orderId}/scan`;

    await addToSyncQueue({
        type: "scan",
        referenceId: id,
        endpoint,
        method: "POST",
        payload: {
            qr_code: scanData.qrCode,
            quantity: scanData.quantity,
            condition: scanData.condition,
            notes: scanData.notes,
            refurb_days_estimate: scanData.refurbDaysEstimate,
            discrepancy_reason: scanData.discrepancyReason,
        },
        priority: 2, // Medium-high priority
    });

    return pendingScan;
}

export async function getPendingScans(orderId?: string): Promise<PendingScanEvent[]> {
    const db = await getDB();

    if (orderId) {
        const scans = await db.getAllFromIndex("pendingScanEvents", "by-order", orderId);
        return scans.filter((s) => s.status === "pending");
    }

    return db.getAllFromIndex("pendingScanEvents", "by-status", "pending");
}

export async function updateScanStatus(
    id: string,
    status: PendingScanEvent["status"],
    errorMessage?: string
): Promise<void> {
    const db = await getDB();
    const scan = await db.get("pendingScanEvents", id);

    if (scan) {
        scan.status = status;
        if (status === "synced") {
            scan.syncedAt = Date.now();
        }
        if (errorMessage) {
            scan.errorMessage = errorMessage;
            scan.retryCount += 1;
        }
        await db.put("pendingScanEvents", scan);
    }
}

// ============================================================
// Scan Progress Cache Operations
// ============================================================

export async function cacheScanProgress(
    orderId: string,
    scanType: "OUTBOUND" | "INBOUND",
    data: ScanProgressCache["data"]
): Promise<void> {
    const db = await getDB();

    const cache: ScanProgressCache = {
        orderId,
        scanType,
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + STORAGE_LIMITS.cacheExpiryMs,
    };

    await db.put("scanProgressCache", cache);
}

export async function getCachedScanProgress(orderId: string): Promise<ScanProgressCache | null> {
    const db = await getDB();
    const cache = await db.get("scanProgressCache", orderId);

    if (cache && !isExpired(cache.expiresAt)) {
        return cache;
    }

    // Delete expired cache
    if (cache) {
        await db.delete("scanProgressCache", orderId);
    }

    return null;
}

export async function clearExpiredCache(): Promise<void> {
    const db = await getDB();
    const now = Date.now();

    const expired = await db.getAllFromIndex("scanProgressCache", "by-expires");
    const toDelete = expired.filter((c) => c.expiresAt < now);

    const tx = db.transaction("scanProgressCache", "readwrite");
    await Promise.all([...toDelete.map((c) => tx.store.delete(c.orderId)), tx.done]);
}

// ============================================================
// Offline Photos Operations
// ============================================================

export async function saveOfflinePhoto(
    orderId: string,
    base64Data: string,
    type: OfflinePhoto["type"],
    scanEventId?: string
): Promise<OfflinePhoto | null> {
    // Check size limit
    const sizeBytes = new Blob([base64Data]).size;

    if (sizeBytes > STORAGE_LIMITS.maxPhotoSizeBytes) {
        console.warn("Photo exceeds size limit, compression needed");
        return null;
    }

    if (!(await isStorageAvailable(sizeBytes))) {
        console.warn("Storage limit reached, cannot save photo");
        return null;
    }

    const db = await getDB();
    const id = generateLocalId();

    const photo: OfflinePhoto = {
        id,
        orderId,
        scanEventId,
        type,
        base64Data,
        mimeType: "image/jpeg",
        sizeBytes,
        status: "pending",
        createdAt: Date.now(),
    };

    await db.put("offlinePhotos", photo);

    // Add to sync queue (lower priority than scans)
    await addToSyncQueue({
        type: "photo",
        referenceId: id,
        endpoint:
            type === "truck"
                ? `/operations/v1/scanning/outbound/${orderId}/truck-photos`
                : `/operations/v1/scanning/inbound/${orderId}/photos`,
        method: "POST",
        payload: { photo_id: id },
        priority: 4, // Lower priority
    });

    return photo;
}

export async function getOfflinePhotos(orderId: string): Promise<OfflinePhoto[]> {
    const db = await getDB();
    return db.getAllFromIndex("offlinePhotos", "by-order", orderId);
}

export async function getPhotoById(id: string): Promise<OfflinePhoto | undefined> {
    const db = await getDB();
    return db.get("offlinePhotos", id);
}

export async function deletePhoto(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("offlinePhotos", id);
}

// ============================================================
// Sync Queue Operations
// ============================================================

async function addToSyncQueue(
    item: Omit<SyncQueueItem, "id" | "status" | "createdAt" | "retryCount" | "maxRetries">
): Promise<void> {
    const db = await getDB();
    const id = generateLocalId();

    const queueItem: SyncQueueItem = {
        ...item,
        id,
        status: "pending",
        createdAt: Date.now(),
        retryCount: 0,
        maxRetries: STORAGE_LIMITS.maxRetries,
    };

    await db.put("syncQueue", queueItem);
}

export async function getNextSyncItem(): Promise<SyncQueueItem | undefined> {
    const db = await getDB();
    const pending = await db.getAllFromIndex("syncQueue", "by-status", "pending");

    // Sort by priority (lower = higher priority), then by created time
    pending.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt - b.createdAt;
    });

    return pending[0];
}

export async function getSyncQueueCount(): Promise<number> {
    const db = await getDB();
    const pending = await db.getAllFromIndex("syncQueue", "by-status", "pending");
    return pending.length;
}

export async function updateSyncQueueItem(
    id: string,
    updates: Partial<
        Pick<SyncQueueItem, "status" | "lastAttemptAt" | "retryCount" | "errorMessage">
    >
): Promise<void> {
    const db = await getDB();
    const item = await db.get("syncQueue", id);

    if (item) {
        Object.assign(item, updates);
        await db.put("syncQueue", item);
    }
}

export async function deleteSyncQueueItem(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("syncQueue", id);
}

export async function clearCompletedSyncItems(): Promise<void> {
    const db = await getDB();
    const items = await db.getAll("syncQueue");

    const toDelete = items.filter((i) => i.status === "pending" && i.retryCount >= i.maxRetries);

    const tx = db.transaction("syncQueue", "readwrite");
    await Promise.all([...toDelete.map((i) => tx.store.delete(i.id)), tx.done]);
}

// ============================================================
// Auth Token Operations
// ============================================================

export async function saveAuthToken(token: Omit<AuthToken, "id" | "storedAt">): Promise<void> {
    const db = await getDB();

    const authToken: AuthToken = {
        ...token,
        id: "current",
        storedAt: Date.now(),
    };

    await db.put("authTokens", authToken);
}

export async function getAuthToken(): Promise<AuthToken | undefined> {
    const db = await getDB();
    const token = await db.get("authTokens", "current");

    if (token && token.expiresAt > Date.now()) {
        return token;
    }

    return undefined;
}

export async function clearAuthToken(): Promise<void> {
    const db = await getDB();
    await db.delete("authTokens", "current");
}

// ============================================================
// Cleanup Operations
// ============================================================

export async function cleanupOldData(): Promise<void> {
    await Promise.all([clearExpiredCache(), deleteSyncedOrders(), clearCompletedSyncItems()]);

    // Recalculate stats
    await calculateStorageStats();
}

export async function clearAllOfflineData(): Promise<void> {
    const db = await getDB();

    await Promise.all([
        db.clear("pendingOrders"),
        db.clear("pendingScanEvents"),
        db.clear("scanProgressCache"),
        db.clear("offlinePhotos"),
        db.clear("syncQueue"),
        db.clear("metadata"),
    ]);
}
