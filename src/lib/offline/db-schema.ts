/**
 * IndexedDB Database Schema for PWA Offline Storage
 * 
 * Storage target: 50-100 MB per user
 * Auto-sync enabled with optional manual trigger
 */

import { DBSchema, openDB, IDBPDatabase } from 'idb';
import type { OrderStatus, FinancialStatus } from '@/types/order';
import type { ScanType } from '@/types/scanning';

// ============================================================
// Type Definitions
// ============================================================

export interface PendingOrder {
  id: string;
  localId: string; // Client-generated UUID
  orderData: {
    items: Array<{
      assetId: string;
      quantity: number;
      assetName: string;
      volume: number;
      weight: number;
    }>;
    eventStartDate: string;
    eventEndDate: string;
    venueName: string;
    venueCountry: string;
    venueCity: string;
    venueAddress: string;
    venueAccessNotes?: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    specialInstructions?: string;
    brand?: string;
  };
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  syncedAt?: number;
  errorMessage?: string;
  retryCount: number;
}

export interface PendingScanEvent {
  id: string;
  localId: string;
  orderId: string;
  scanType: ScanType;
  qrCode: string;
  quantity: number;
  condition?: 'GREEN' | 'ORANGE' | 'RED';
  notes?: string;
  photoIds?: string[]; // References to OfflinePhoto entries
  discrepancyReason?: 'BROKEN' | 'LOST' | 'OTHER';
  refurbDaysEstimate?: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  syncedAt?: number;
  errorMessage?: string;
  retryCount: number;
}

export interface ScanProgressCache {
  orderId: string;
  scanType: ScanType;
  data: {
    orderStatus: string;
    totalItems: number;
    itemsScanned: number;
    percentComplete: number;
    assets: Array<{
      assetId: string;
      assetName: string;
      qrCode: string;
      trackingMethod: 'INDIVIDUAL' | 'BATCH';
      requiredQuantity: number;
      scannedQuantity: number;
      isComplete: boolean;
    }>;
  };
  cachedAt: number;
  expiresAt: number;
}

export interface OfflinePhoto {
  id: string;
  orderId: string;
  scanEventId?: string;
  type: 'truck' | 'damage' | 'condition';
  base64Data: string; // Compressed base64 image
  mimeType: string;
  sizeBytes: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  createdAt: number;
  syncedAt?: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'order' | 'scan' | 'photo' | 'complete-scan';
  referenceId: string; // ID of the pending item
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: unknown;
  priority: number; // Lower = higher priority
  status: 'pending' | 'syncing' | 'failed';
  createdAt: number;
  lastAttemptAt?: number;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
}

export interface AuthToken {
  id: 'current';
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  userEmail: string;
  userName: string;
  permissions: string[];
  storedAt: number;
}

export interface OfflineMetadata {
  id: string;
  totalSizeBytes: number;
  orderCount: number;
  scanCount: number;
  photoCount: number;
  lastSyncAt: number | null;
  lastCalculatedAt: number;
  data?: unknown;
  cachedAt?: number;
  orderId?: string;
}

// ============================================================
// Database Schema
// ============================================================

export interface OfflineDBSchema extends DBSchema {
  pendingOrders: {
    key: string;
    value: PendingOrder;
    indexes: {
      'by-status': string;
      'by-created': number;
    };
  };
  pendingScanEvents: {
    key: string;
    value: PendingScanEvent;
    indexes: {
      'by-order': string;
      'by-status': string;
      'by-created': number;
    };
  };
  scanProgressCache: {
    key: string;
    value: ScanProgressCache;
    indexes: {
      'by-expires': number;
    };
  };
  offlinePhotos: {
    key: string;
    value: OfflinePhoto;
    indexes: {
      'by-order': string;
      'by-scan-event': string;
      'by-status': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-priority': number;
      'by-status': string;
      'by-type': string;
    };
  };
  authTokens: {
    key: string;
    value: AuthToken;
  };
  metadata: {
    key: string;
    value: OfflineMetadata;
  };
}

// ============================================================
// Database Configuration
// ============================================================

export const DB_NAME = 'logistic-pmg-offline';
export const DB_VERSION = 1;

// Storage limits (50-100 MB target)
export const STORAGE_LIMITS = {
  maxTotalBytes: 100 * 1024 * 1024, // 100 MB
  warningThresholdBytes: 80 * 1024 * 1024, // 80 MB warning
  maxPhotoSizeBytes: 500 * 1024, // 500 KB per photo (compressed)
  maxPhotosPerOrder: 20,
  cacheExpiryMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRetries: 5,
};

// ============================================================
// Database Initialization
// ============================================================

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Create object stores on first initialization
      if (oldVersion < 1) {
        // Pending Orders store
        const ordersStore = db.createObjectStore('pendingOrders', {
          keyPath: 'id',
        });
        ordersStore.createIndex('by-status', 'status');
        ordersStore.createIndex('by-created', 'createdAt');

        // Pending Scan Events store
        const scansStore = db.createObjectStore('pendingScanEvents', {
          keyPath: 'id',
        });
        scansStore.createIndex('by-order', 'orderId');
        scansStore.createIndex('by-status', 'status');
        scansStore.createIndex('by-created', 'createdAt');

        // Scan Progress Cache store
        const cacheStore = db.createObjectStore('scanProgressCache', {
          keyPath: 'orderId',
        });
        cacheStore.createIndex('by-expires', 'expiresAt');

        // Offline Photos store
        const photosStore = db.createObjectStore('offlinePhotos', {
          keyPath: 'id',
        });
        photosStore.createIndex('by-order', 'orderId');
        photosStore.createIndex('by-scan-event', 'scanEventId');
        photosStore.createIndex('by-status', 'status');

        // Sync Queue store
        const syncStore = db.createObjectStore('syncQueue', {
          keyPath: 'id',
        });
        syncStore.createIndex('by-priority', 'priority');
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-type', 'type');

        // Auth Tokens store
        db.createObjectStore('authTokens', {
          keyPath: 'id',
        });

        // Metadata store
        db.createObjectStore('metadata', {
          keyPath: 'id',
        });
      }
    },
    blocked() {
      console.warn('IndexedDB upgrade blocked by open connection');
    },
    blocking() {
      console.warn('IndexedDB blocking another upgrade');
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      console.error('IndexedDB connection terminated unexpectedly');
      dbInstance = null;
    },
  });

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ============================================================
// Utility Functions
// ============================================================

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function isExpired(expiresAt: number): boolean {
  return Date.now() > expiresAt;
}
