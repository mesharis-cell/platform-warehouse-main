"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useSelfPickupReturnProgress,
    useScanSelfPickupReturnItem,
    useCompleteSelfPickupReturn,
} from "@/hooks/use-scanning";
import {
    PooledSettlementModal,
    type UnsettledLine,
    type SettlementEntry,
} from "@/components/scanning/PooledSettlementModal";
import { Camera, CheckCircle2, ScanLine, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";

type ScanStep = "scanning" | "complete";

export default function SelfPickupReturnPage() {
    const params = useParams();
    const router = useRouter();
    const selfPickupId = params.selfPickupId as string;

    const progress = useSelfPickupReturnProgress(selfPickupId);
    const scanItem = useScanSelfPickupReturnItem();
    const completeScan = useCompleteSelfPickupReturn();

    const [step, setStep] = useState<ScanStep>("scanning");
    const [manualQr, setManualQr] = useState("");
    const [batchQuantity, setBatchQuantity] = useState(1);
    const [scanCondition, setScanCondition] = useState<"GREEN" | "ORANGE" | "RED">("GREEN");
    const [cameraActive, setCameraActive] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);

    // Settlement modal state
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [unsettledLines, setUnsettledLines] = useState<UnsettledLine[]>([]);

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
            { selfPickupId, qr_code: qrCode, condition: scanCondition, quantity },
            {
                onSuccess: (data: any) => {
                    const asset = data?.data?.asset;
                    toast.success(`Returned: ${asset?.asset_name || qrCode}`);
                },
                onError: (error: any) => {
                    toast.error("Scan failed", { description: error?.response?.data?.message || error.message });
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

    const doComplete = (settlements?: SettlementEntry[]) => {
        completeScan.mutate(
            { selfPickupId, settlements },
            {
                onSuccess: () => {
                    setShowSettlementModal(false);
                    setStep("complete");
                    toast.success("Return complete — self-pickup closed");
                    setTimeout(() => router.push(`/self-pickups/${selfPickupId}`), 2000);
                },
                onError: (error: any) => {
                    const requiresSettlement =
                        error?.response?.data?.errorSources?.[0]?.requires_settlement ||
                        error?.response?.data?.requires_settlement;

                    if (requiresSettlement && Array.isArray(requiresSettlement)) {
                        setUnsettledLines(requiresSettlement);
                        setShowSettlementModal(true);
                    } else {
                        toast.error("Cannot complete", { description: error.message });
                    }
                },
            }
        );
    };

    const handleComplete = () => doComplete();

    const startCamera = async () => {
        try {
            const scanner = new Html5Qrcode("qr-reader-return");
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
                    <h2 className="text-2xl font-bold">RETURN COMPLETE</h2>
                    <p className="text-muted-foreground">Self-pickup closed successfully.</p>
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
                    <h1 className="text-xl font-bold font-mono">PICKUP RETURN</h1>
                    <p className="text-sm text-muted-foreground">{progressData.self_pickup_id}</p>
                </div>
            </div>

            <Progress value={progressData.percent_complete} className="h-3" />
            <p className="text-center text-sm font-mono">
                {progressData.items_scanned} / {progressData.total_items} items ({progressData.percent_complete}%)
            </p>

            {/* Camera */}
            <div id="qr-reader-return" className="rounded-lg overflow-hidden" />
            {!cameraActive && (
                <Button onClick={startCamera} className="w-full gap-2">
                    <Camera className="h-4 w-4" /> Start Camera
                </Button>
            )}

            {/* Manual entry with condition */}
            <Card className="p-4 space-y-3">
                <p className="text-xs font-mono text-muted-foreground">MANUAL ENTRY</p>
                <div className="flex gap-2">
                    <Input placeholder="QR code" value={manualQr} onChange={(e) => setManualQr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManualScan()} className="flex-1" />
                    <Input type="number" min={1} value={batchQuantity} onChange={(e) => setBatchQuantity(Number(e.target.value))} className="w-20" />
                    <Select value={scanCondition} onValueChange={(v) => setScanCondition(v as any)}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GREEN">Green</SelectItem>
                            <SelectItem value="ORANGE">Orange</SelectItem>
                            <SelectItem value="RED">Red</SelectItem>
                        </SelectContent>
                    </Select>
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

            {/* Complete button — always visible on return, since pooled items may be partial */}
            <Button onClick={handleComplete} disabled={completeScan.isPending} className="w-full" size="lg">
                {completeScan.isPending ? "COMPLETING..." : "COMPLETE RETURN SCAN"}
            </Button>

            {/* Settlement modal */}
            <PooledSettlementModal
                open={showSettlementModal}
                onOpenChange={setShowSettlementModal}
                unsettledLines={unsettledLines}
                onConfirm={(settlements) => doComplete(settlements)}
                isPending={completeScan.isPending}
            />
        </div>
    );
}
