"use client";

/**
 * Transformed Asset Warning
 * Shows when scanning a QR of an asset that has been reskinned/transformed
 */

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface TransformedAssetWarningProps {
    oldAssetName: string;
    oldQrCode: string;
    newAssetName: string;
    newQrCode: string;
    onScanNewQr: () => void;
    onViewNewAsset?: () => void;
}

export function TransformedAssetWarning({
    oldAssetName,
    oldQrCode,
    newAssetName,
    newQrCode,
    onScanNewQr,
    onViewNewAsset,
}: TransformedAssetWarningProps) {
    return (
        <div className="p-6">
            <Alert
                variant="destructive"
                className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
            >
                <AlertTriangle className="h-6 w-6 text-amber-600" />
                <AlertTitle className="text-amber-900 dark:text-amber-100 text-lg">
                    ⚠️ ASSET TRANSFORMED
                </AlertTitle>
                <AlertDescription className="text-amber-800 dark:text-amber-200 space-y-3 mt-3">
                    <p>This asset has been transformed and is no longer in use.</p>

                    <div className="space-y-2 text-sm bg-white/50 dark:bg-black/20 p-3 rounded-md">
                        <div>
                            <p className="font-semibold">Old Asset:</p>
                            <p>{oldAssetName}</p>
                            <p className="text-xs font-mono text-muted-foreground">
                                QR: {oldQrCode}
                            </p>
                        </div>

                        <div className="border-t border-amber-300 dark:border-amber-700 pt-2">
                            <p className="font-semibold">New Asset:</p>
                            <p>{newAssetName}</p>
                            <p className="text-xs font-mono text-muted-foreground">
                                QR: {newQrCode}
                            </p>
                        </div>
                    </div>

                    <p className="font-semibold mt-4">
                        Please use the NEW asset QR code for this order.
                    </p>

                    <div className="flex flex-col gap-2 mt-4">
                        <Button onClick={onScanNewQr} size="lg" className="w-full">
                            Scan New QR Code
                        </Button>
                        {onViewNewAsset && (
                            <Button
                                onClick={onViewNewAsset}
                                variant="outline"
                                size="lg"
                                className="w-full"
                            >
                                View New Asset Details
                            </Button>
                        )}
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    );
}
