/**
 * Background Sync Manager
 * 
 * Processes the sync queue with retry logic and priority ordering.
 * Auto-syncs orders and scans when online.
 */

import { apiClient } from '@/lib/api/api-client';
import {
  getNextSyncItem,
  updateSyncQueueItem,
  deleteSyncQueueItem,
  getSyncQueueCount,
  updateOrderStatus,
  updateScanStatus,
  getPhotoById,
  deletePhoto,
  type SyncQueueItem,
} from './offline-storage';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  remainingCount: number;
}

interface SyncOptions {
  maxItems?: number;
  onProgress?: (current: number, total: number) => void;
}

// Exponential backoff delays (in ms)
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

function getRetryDelay(retryCount: number): number {
  return RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
}

async function processOrderSync(item: SyncQueueItem): Promise<boolean> {
  try {
    await apiClient.post(item.endpoint, item.payload);
    
    // Update order status
    await updateOrderStatus(item.referenceId, 'synced');
    
    return true;
  } catch (error) {
    console.error('Order sync failed:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    await updateOrderStatus(item.referenceId, 'failed', message);
    
    return false;
  }
}

async function processScanSync(item: SyncQueueItem): Promise<boolean> {
  try {
    await apiClient.post(item.endpoint, item.payload);
    
    // Update scan status
    await updateScanStatus(item.referenceId, 'synced');
    
    return true;
  } catch (error) {
    console.error('Scan sync failed:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    await updateScanStatus(item.referenceId, 'failed', message);
    
    return false;
  }
}

async function processPhotoSync(item: SyncQueueItem): Promise<boolean> {
  try {
    const photo = await getPhotoById(item.referenceId);
    
    if (!photo) {
      console.warn('Photo not found for sync:', item.referenceId);
      return true; // Consider it synced since photo doesn't exist
    }
    
    // Upload photo
    await apiClient.post(item.endpoint, {
      photos: [photo.base64Data],
    });
    
    // Delete photo from local storage after successful upload
    await deletePhoto(item.referenceId);
    
    return true;
  } catch (error) {
    console.error('Photo sync failed:', error);
    return false;
  }
}

async function processCompleteScanSync(item: SyncQueueItem): Promise<boolean> {
  try {
    await apiClient.post(item.endpoint, item.payload);
    return true;
  } catch (error) {
    console.error('Complete scan sync failed:', error);
    return false;
  }
}

async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  // Mark as syncing
  await updateSyncQueueItem(item.id, {
    status: 'syncing',
    lastAttemptAt: Date.now(),
  });

  let success = false;

  switch (item.type) {
    case 'order':
      success = await processOrderSync(item);
      break;
    case 'scan':
      success = await processScanSync(item);
      break;
    case 'photo':
      success = await processPhotoSync(item);
      break;
    case 'complete-scan':
      success = await processCompleteScanSync(item);
      break;
    default:
      console.warn('Unknown sync item type:', item.type);
      success = false;
  }

  if (success) {
    // Remove from queue on success
    await deleteSyncQueueItem(item.id);
  } else {
    // Update retry count and status
    const newRetryCount = item.retryCount + 1;
    
    if (newRetryCount >= item.maxRetries) {
      // Max retries reached, mark as failed
      await updateSyncQueueItem(item.id, {
        status: 'failed',
        retryCount: newRetryCount,
        errorMessage: 'Max retries exceeded',
      });
    } else {
      // Reset to pending with incremented retry count
      await updateSyncQueueItem(item.id, {
        status: 'pending',
        retryCount: newRetryCount,
      });
    }
  }

  return success;
}

export async function processSyncQueue(options: SyncOptions = {}): Promise<SyncResult> {
  const { maxItems = 50, onProgress } = options;
  
  let syncedCount = 0;
  let failedCount = 0;
  let processedCount = 0;
  
  const totalCount = await getSyncQueueCount();
  
  while (processedCount < maxItems) {
    const item = await getNextSyncItem();
    
    if (!item) {
      break; // No more items to process
    }
    
    // Check if we should wait before retrying
    if (item.lastAttemptAt) {
      const delay = getRetryDelay(item.retryCount);
      const timeSinceLastAttempt = Date.now() - item.lastAttemptAt;
      
      if (timeSinceLastAttempt < delay) {
        // Skip this item for now, will retry later
        processedCount++;
        continue;
      }
    }
    
    const success = await processSyncItem(item);
    
    if (success) {
      syncedCount++;
    } else {
      failedCount++;
    }
    
    processedCount++;
    
    if (onProgress) {
      onProgress(processedCount, totalCount);
    }
    
    // Small delay between items to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const remainingCount = await getSyncQueueCount();
  
  return {
    syncedCount,
    failedCount,
    remainingCount,
  };
}

// Queue a complete scan operation
export async function queueCompleteScan(
  orderId: string,
  scanType: 'OUTBOUND' | 'INBOUND'
): Promise<void> {
  const { getDB, generateLocalId } = await import('./db-schema');
  const db = await getDB();
  
  const endpoint = scanType === 'OUTBOUND'
    ? `/operations/v1/scanning/outbound/${orderId}/complete`
    : `/operations/v1/scanning/inbound/${orderId}/complete`;
  
  const id = generateLocalId();
  
  await db.put('syncQueue', {
    id,
    type: 'complete-scan',
    referenceId: orderId,
    endpoint,
    method: 'POST',
    payload: {},
    priority: 3, // Medium priority
    status: 'pending',
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 5,
  });
}
