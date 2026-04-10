"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
    useSelfPickupHandoverProgress,
    useScanSelfPickupHandoverItem,
    useCompleteSelfPickupHandover,
} from "@/hooks/use-scanning";
import { Camera, CheckCircle2, ScanLine, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";

type ScanStep = "scanning" | "complete";

export default function SelfPickupHandoverPage() {
    const params = useParams();
    const router = useRouter();
    const selfPickupId = params.selfPickupId as string;

    const progress = useSelfPickupHandoverProgress(selfPickupId);
    const scanItem = useScanSelfPickupHandoverItem();
    const completeScan = useCompleteSelfPickupHandover();

    const [step, setStep] = useState<ScanStep>("scanning");
    const [manualQr, setManualQr] = useState("");
    const [batchQuantity, setBatchQuantity] = useState(1);
    const [cameraActive, setCameraActive] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);

    const progressData = progress.data?.data;
    const assets = progressData?.assets || [];

    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(() => {});
            }
        };
    }, []);

    const handleScan = (qrCode: string, quantity?: number) => {
        const now = Date.now();
        if (now - lastScanRef.current < 2000) return;
        lastScanRef.current = now;

        scanItem.mutate(
            { selfPickupId, qr_code: qrCode, quantity },
            {
                onSuccess: (data: any) => {
                    const asset = data?.data?.asset;
                    toast.success(`Scanned: ${asset?.asset_name || qrCode}`, {
                        description: `${asset?.scanned_quantity}/${asset?.required_quantity}`,
                    });
                    if (data?.data?.progress?.percent_complete === 100) {
                        handleComplete();
                    }
                },
                onError: (error: any) => {
                    const msg = error?.response?.data?.message || error.message;
                    toast.error("Scan failed", { description: msg });
                },
            }
        );
    };

    const handleManualScan = () => {
        if (!manualQr.trim()) return;
        handleScan(manualQr.trim(), batchQuantity > 1 ? batchQuantity : undefined);
        setManualQr("");
        setBatchQuantity(1);
    };

    const handleComplete = () => {
        completeScan.mutate(
            { selfPickupId },
            {
                onSuccess: () => {
                    setStep("complete");
                    toast.success("Handover complete — items picked up");
                    setTimeout(() => router.push(`/self-pickups/${selfPickupId}`), 2000);
                },
                onError: (error: any) => {
                    toast.error("Cannot complete", { description: error.message });
                },
            }
        );
    };

    const startCamera = async () => {
        try {
            const scanner = new Html5Qrcode("qr-reader-handover");
            scannerRef.current = scanner;
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => handleScan(decodedText),
                () => {}
            );
            setCameraActive(true);
        } catch {
            toast.error("Camera access denied");
        }
    };

    if (progress.isLoading || !progressData) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="p-8 text-center space-y-4">
                    <ScanLine className="w-12 h-12 mx-auto animate-pulse text-primary" />
                    <h2 className="text-xl font-bold font-mono">LOADING</h2>
                </Card>
            </div>
        );
    }

    if (step === "complete") {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="p-8 text-center space-y-4 max-w-md">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
                    <h2 className="text-2xl font-bold">HANDOVER COMPLETE</h2>
                    <p className="text-muted-foreground">All items handed to collector.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 space-y-4">
            <div className="flex items-center gap-4">
                <Link href={`/self-pickups/${selfPickupId}`}>
                    <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold font-mono">PICKUP HANDOVER</h1>
                    <p className="text-sm text-muted-foreground">{progressData.self_pickup_id}</p>
                </div>
            </div>

            <Progress value={progressData.percent_complete} className="h-3" />
            <p className="text-center text-sm font-mono">
                {progressData.items_scanned} / {progressData.total_items} items ({progressData.percent_complete}%)
            </p>

            {/* Camera */}
            <div id="qr-reader-handover" className="rounded-lg overflow-hidden" />
            {!cameraActive && (
                <Button onClick={startCamera} className="w-full gap-2">
                    <Camera className="h-4 w-4" /> Start Camera
                </Button>
            )}

            {/* Manual entry */}
            <Card className="p-4 space-y-3">
                <p className="text-xs font-mono text-muted-foreground">MANUAL ENTRY</p>
                <div className="flex gap-2">
                    <Input placeholder="QR code" value={manualQr} onChange={(e) => setManualQr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualScan()} />
                    <Input type="number" min={1} value={batchQuantity} onChange={(e) => setBatchQuantity(Number(e.target.value))} className="w-20" placeholder="Qty" />
                    <Button onClick={handleManualScan} disabled={!manualQr.trim()}>Scan</Button>
                </div>
            </Card>

            {/* Item list */}
            <div className="space-y-2">
                {assets.map((asset: any) => (
                    <div key={asset.asset_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                            <p className="font-medium text-sm">{asset.asset_name}</p>
                            <p className="text-xs text-muted-foreground">{asset.tracking_method}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">{asset.scanned_quantity}/{asset.required_quantity}</span>
                            {asset.is_complete ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Package className="w-4 h-4 text-muted-foreground" />}
                        </div>
                    </div>
                ))}
            </div>

            {progressData.percent_complete === 100 && (
                <Button onClick={handleComplete} disabled={completeScan.isPending} className="w-full" size="lg">
                    {completeScan.isPending ? "COMPLETING..." : "CONFIRM HANDOVER"}
                </Button>
            )}
        </div>
    );
}
