'use client';

/**
 * Enhanced Offline Page
 * 
 * Shows offline status with pending sync information.
 */

import { WifiOff, RefreshCw, Cloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNetwork } from '@/providers/network-provider';

export default function OfflinePage() {
  const { network, sync, triggerSync } = useNetwork();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md space-y-6">
        {/* Status Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <h1 className="text-2xl font-bold">You&apos;re Offline</h1>

        <p className="text-muted-foreground">
          It looks like you&apos;ve lost your internet connection.
          Please check your network settings and try again.
        </p>

        {/* Pending Sync Status */}
        {sync.pendingCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <Cloud className="h-4 w-4 text-primary" />
                PENDING SYNC
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Orders</span>
                <Badge variant="outline" className="font-mono">
                  {sync.pendingCount}
                </Badge>
              </div>

              {sync.failedCount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Failed
                  </span>
                  <Badge variant="destructive" className="font-mono">
                    {sync.failedCount}
                  </Badge>
                </div>
              )}

              {sync.lastSyncedAt && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Last synced</span>
                  <span className="font-mono text-xs">
                    {sync.lastSyncedAt.toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>

          {network.isOnline && sync.pendingCount > 0 && (
            <Button
              onClick={triggerSync}
              variant="outline"
              className="w-full gap-2"
              disabled={sync.isSyncing}
            >
              {sync.isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          )}
        </div>

        {/* Reassurance Message */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Your work is saved locally</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            All changes will sync automatically when you&apos;re back online.
          </p>
        </div>
      </div>
    </div>
  );
}
