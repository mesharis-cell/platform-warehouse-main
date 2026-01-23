'use client';

/**
 * Offline-Aware Order Hooks
 * 
 * Enables viewing order lists and order details when offline.
 * Caches orders for offline access and syncs when back online.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNetwork } from '@/providers/network-provider';
import { useAdminOrders, useAdminOrderDetails } from './use-orders';
import type { APIOrdersResponse, APIOrder } from '@/types/order';

// ============================================================
// Cache Keys
// ============================================================

const ORDERS_CACHE_KEY = 'orders-list-cache';
const ORDER_DETAILS_CACHE_KEY = 'order-details-cache';

// ============================================================
// Offline Order List Hook
// ============================================================

export function useOfflineAdminOrders(
  params: {
    page?: number;
    limit?: number;
    company?: string;
    brand?: string;
    order_status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  const { network } = useNetwork();
  const onlineQuery = useAdminOrders(params);
  const queryClient = useQueryClient();

  // Query for cached orders when offline
  const cachedQuery = useQuery({
    queryKey: ['offlineOrders', params],
    queryFn: async () => {
      const { getDB } = await import('@/lib/offline/db-schema');
      const db = await getDB();
      
      // Try to get cached orders from IndexedDB
      const metadata = await db.get('metadata', ORDERS_CACHE_KEY);

      if (!metadata || !('data' in metadata) || !('cachedAt' in metadata)) return null;

      // Return cached data with offline indicator
      return {
        ...(metadata.data as APIOrdersResponse),
        _offline: true,
        _cachedAt: metadata.cachedAt as number,
      } as APIOrdersResponse & { _offline: boolean; _cachedAt: number };
    },
    enabled: !network.isOnline,
    staleTime: Infinity,
  });

  // Cache successful online responses
  if (onlineQuery.data && network.isOnline) {
    const data = onlineQuery.data as APIOrdersResponse;
    
    // Cache to IndexedDB for offline use
    import('@/lib/offline/db-schema').then(async ({ getDB }) => {
      const db = await getDB();
      await db.put('metadata', {
        id: ORDERS_CACHE_KEY,
        data: data,
        cachedAt: Date.now(),
        totalSizeBytes: 0,
        orderCount: data.data?.length || 0,
        scanCount: 0,
        photoCount: 0,
        lastSyncAt: Date.now(),
        lastCalculatedAt: Date.now(),
      });
    });
  }

  // Return cached data when offline, online data when online
  if (network.isOnline) {
    return onlineQuery;
  }

  return {
    ...cachedQuery,
    data: cachedQuery.data,
    isLoading: cachedQuery.isLoading,
    isError: cachedQuery.isError && !cachedQuery.data,
  };
}

// ============================================================
// Offline Order Details Hook
// ============================================================

interface CachedOrderDetails {
  orderId: string;
  data: unknown;
  cachedAt: number;
}

export function useOfflineAdminOrderDetails(orderId: string | null) {
  const { network } = useNetwork();
  const onlineQuery = useAdminOrderDetails(orderId);

  // Query for cached order details when offline
  const cachedQuery = useQuery({
    queryKey: ['offlineOrderDetails', orderId],
    queryFn: async () => {
      const { getDB } = await import('@/lib/offline/db-schema');
      const db = await getDB();
      
      // Get cached order details
      const cacheKey = `${ORDER_DETAILS_CACHE_KEY}-${orderId}`;
      const cached = await db.get('metadata', cacheKey);

      const cachedDetails = cached as CachedOrderDetails | null;
      if (!cachedDetails?.data) return null;

      return {
        ...(cachedDetails.data as Record<string, unknown>),
        _offline: true,
        _cachedAt: cachedDetails.cachedAt,
      };
    },
    enabled: !!orderId && !network.isOnline,
    staleTime: Infinity,
  });

  // Cache successful online responses
  if (onlineQuery.data && network.isOnline && orderId) {
    import('@/lib/offline/db-schema').then(async ({ getDB }) => {
      const db = await getDB();
      const cacheKey = `${ORDER_DETAILS_CACHE_KEY}-${orderId}`;
      
      await db.put('metadata', {
        id: cacheKey,
        orderId,
        data: onlineQuery.data,
        cachedAt: Date.now(),
        totalSizeBytes: 0,
        orderCount: 1,
        scanCount: 0,
        photoCount: 0,
        lastSyncAt: Date.now(),
        lastCalculatedAt: Date.now(),
      });
    });
  }

  // Return cached data when offline
  if (network.isOnline) {
    return onlineQuery;
  }

  return {
    ...cachedQuery,
    data: cachedQuery.data,
    isLoading: cachedQuery.isLoading,
    isError: cachedQuery.isError && !cachedQuery.data,
  };
}

// ============================================================
// Cache Management
// ============================================================

/**
 * Pre-cache specific orders for offline viewing
 */
export async function cacheOrderForOffline(orderId: string, orderData: unknown): Promise<void> {
  const { getDB } = await import('@/lib/offline/db-schema');
  const db = await getDB();
  
  const cacheKey = `${ORDER_DETAILS_CACHE_KEY}-${orderId}`;
  
  await db.put('metadata', {
    id: cacheKey,
    orderId,
    data: orderData,
    cachedAt: Date.now(),
    totalSizeBytes: 0,
    orderCount: 1,
    scanCount: 0,
    photoCount: 0,
    lastSyncAt: Date.now(),
    lastCalculatedAt: Date.now(),
  });
}

/**
 * Clear cached orders
 */
export async function clearOrdersCache(): Promise<void> {
  const { getDB } = await import('@/lib/offline/db-schema');
  const db = await getDB();
  
  // Get all cached order keys
  const allMetadata = await db.getAll('metadata');
  const orderCacheKeys = allMetadata
    .filter(m => m.id.startsWith(ORDER_DETAILS_CACHE_KEY) || m.id === ORDERS_CACHE_KEY)
    .map(m => m.id);
  
  // Delete all cached orders
  const tx = db.transaction('metadata', 'readwrite');
  await Promise.all([
    ...orderCacheKeys.map(key => tx.store.delete(key)),
    tx.done,
  ]);
}

/**
 * Get cached order count
 */
export async function getCachedOrderCount(): Promise<number> {
  const { getDB } = await import('@/lib/offline/db-schema');
  const db = await getDB();
  
  const allMetadata = await db.getAll('metadata');
  return allMetadata.filter(m => m.id.startsWith(ORDER_DETAILS_CACHE_KEY)).length;
}
