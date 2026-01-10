'use client';

/**
 * Network Status Hook
 * 
 * Detects network connectivity and provides real-time status updates.
 */

import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
}

interface NetworkInformation extends EventTarget {
  type: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  onchange: (() => void) | null;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

function getNetworkInfo(): Partial<NetworkStatus> {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const connection = 
    navigator.connection || 
    navigator.mozConnection || 
    navigator.webkitConnection;

  if (!connection) {
    return {};
  }

  return {
    connectionType: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink ?? null,
    rtt: connection.rtt ?? null,
    isSlowConnection: 
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.saveData === true,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    downlink: null,
    rtt: null,
    ...getNetworkInfo(),
  }));

  const updateNetworkStatus = useCallback(() => {
    const networkInfo = getNetworkInfo();
    
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      ...networkInfo,
    }));
  }, []);

  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes if available
    const connection = 
      navigator.connection || 
      navigator.mozConnection || 
      navigator.webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Initial check
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return status;
}

// Simple hook that just returns online status
export function useIsOnline(): boolean {
  const { isOnline } = useNetworkStatus();
  return isOnline;
}
