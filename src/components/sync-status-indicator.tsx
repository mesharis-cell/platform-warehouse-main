'use client';

/**
 * Sync Status Indicator Component
 * 
 * Global UI indicator showing online/offline status and pending sync count.
 * Can be placed in the app header or layout.
 */

import { useState } from 'react';
import { useNetwork } from '@/providers/network-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function SyncStatusIndicator({
  className,
  showLabel = false,
  compact = false,
}: SyncStatusIndicatorProps) {
  const { network, sync, triggerSync } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);

  const getStatusColor = () => {
    if (!network.isOnline) return 'text-destructive';
    if (sync.isSyncing) return 'text-primary animate-pulse';
    if (sync.pendingCount > 0) return 'text-warning';
    if (sync.failedCount > 0) return 'text-destructive';
    return 'text-primary';
  };

  const getStatusIcon = () => {
    if (!network.isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }
    if (sync.isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (sync.pendingCount > 0) {
      return <Cloud className="h-4 w-4" />;
    }
    if (sync.failedCount > 0) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <CheckCircle2 className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (!network.isOnline) return 'Offline';
    if (sync.isSyncing) return 'Syncing...';
    if (sync.pendingCount > 0) return `${sync.pendingCount} pending`;
    if (sync.failedCount > 0) return `${sync.failedCount} failed`;
    return 'Synced';
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', getStatusColor(), className)}>
        {getStatusIcon()}
        {sync.pendingCount > 0 && (
          <Badge variant="secondary" className="h-5 px-1.5 text-xs font-mono">
            {sync.pendingCount}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2', className)}
        >
          <span className={getStatusColor()}>
            {getStatusIcon()}
          </span>
          {showLabel && (
            <span className="text-sm font-mono">{getStatusText()}</span>
          )}
          {sync.pendingCount > 0 && !showLabel && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs font-mono">
              {sync.pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          {/* Network Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {network.isOnline ? (
                <Wifi className="h-4 w-4 text-primary" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <span className="text-sm font-medium">
                {network.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            {network.isSlowConnection && (
              <Badge variant="outline" className="text-xs">Slow</Badge>
            )}
          </div>

          {/* Sync Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending items</span>
              <span className="font-mono">{sync.pendingCount}</span>
            </div>

            {sync.failedCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-destructive">Failed items</span>
                <span className="font-mono text-destructive">{sync.failedCount}</span>
              </div>
            )}

            {sync.lastSyncedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last synced</span>
                <span className="font-mono text-xs">
                  {sync.lastSyncedAt.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Sync Button */}
          {network.isOnline && sync.pendingCount > 0 && (
            <Button
              onClick={() => {
                triggerSync();
                setIsOpen(false);
              }}
              disabled={sync.isSyncing}
              className="w-full gap-2"
              size="sm"
            >
              {sync.isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </>
              )}
            </Button>
          )}

          {/* Offline Message */}
          {!network.isOnline && (
            <p className="text-xs text-muted-foreground">
              Your changes will sync automatically when you're back online.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Compact inline badge for header usage
export function SyncBadge({ className }: { className?: string }) {
  const { network, sync } = useNetwork();

  if (network.isOnline && sync.pendingCount === 0 && sync.failedCount === 0) {
    return null; // Don't show when fully synced
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {!network.isOnline ? (
        <Badge variant="destructive" className="gap-1 font-mono">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      ) : sync.isSyncing ? (
        <Badge variant="secondary" className="gap-1 font-mono">
          <Loader2 className="h-3 w-3 animate-spin" />
          Syncing
        </Badge>
      ) : sync.pendingCount > 0 ? (
        <Badge variant="outline" className="gap-1 font-mono text-warning border-warning">
          <Cloud className="h-3 w-3" />
          {sync.pendingCount} pending
        </Badge>
      ) : sync.failedCount > 0 ? (
        <Badge variant="destructive" className="gap-1 font-mono">
          <AlertCircle className="h-3 w-3" />
          {sync.failedCount} failed
        </Badge>
      ) : null}
    </div>
  );
}
