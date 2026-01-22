'use client'

/**
 * Asset Lineage Display
 * Shows transformation history for reskinned assets
 */

import { ArrowRight, History } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface AssetLineageProps {
  transformedFrom?: {
    id: string
    name: string
    qrCode: string
  }
  transformedTo?: {
    id: string
    name: string
    qrCode: string
  }
}

export function AssetLineage({ transformedFrom, transformedTo }: AssetLineageProps) {
  if (!transformedFrom && !transformedTo) {
    return null
  }

  return (
    <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5" />
          Asset Transformation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transformedFrom && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Transformed From:</p>
            <div className="flex items-center gap-2 p-2 bg-background rounded-md">
              <div className="flex-1">
                <p className="font-semibold text-sm">{transformedFrom.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{transformedFrom.qrCode}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/assets/${transformedFrom.id}`}>View</Link>
              </Button>
            </div>
          </div>
        )}

        {transformedTo && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Transformed To:</p>
            <div className="flex items-center gap-2 p-2 bg-background rounded-md">
              <div className="flex-1">
                <p className="font-semibold text-sm">{transformedTo.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{transformedTo.qrCode}</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/assets/${transformedTo.id}`}>View</Link>
              </Button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ This asset has been transformed. Use new asset for orders.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
