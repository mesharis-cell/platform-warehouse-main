'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2">You&apos;re Offline</h1>

        <p className="text-muted-foreground mb-6">
          It looks like you&apos;ve lost your internet connection.
          Please check your network settings and try again.
        </p>

        <Button onClick={handleRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>

        <p className="text-sm text-muted-foreground mt-6">
          Don&apos;t worry - any work you&apos;ve done will be saved once you&apos;re back online.
        </p>
      </div>
    </div>
  );
}
