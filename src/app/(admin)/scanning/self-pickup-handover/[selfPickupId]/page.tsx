"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    useSelfPickupHandoverProgress,
    useScanSelfPickupHandoverItem,
    useCompleteSelfPickupHandover,
    useAddSelfPickupItemMidflow,
} from "@/hooks/use-scanning";
import { useMarkReadyForPickup, useSelfPickupDetails } from "@/hooks/use-self-pickups";
import { useSearchAssets } from "@/hooks/use-assets";
import { usePlatform } from "@/contexts/platform-context";
import { Camera, CheckCircle2, ScanLine, Package, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import Link from "next/link";

type ScanStep = "scanning" | "complete";

export default function SelfPickupHandoverPage() {
    const params = useParams();
    const router = useRouter();
    const selfPickupId = params.selfPickupId as string;

    const { platform, isLoading: platformLoading } = usePlatform();
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;

    useEffect(() => {
        if (!platformLoading && !selfPickupEnabled) {
            router.replace("/orders");
        }
    }, [platformLoading, selfPickupEnabled, router]);

    const progress = useSelfPickupHandoverProgress(selfPickupId);
    const scanItem = useScanSelfPickupHandoverItem();
    const completeScan = useCompleteSelfPickupHandover();
    const markReady = useMarkReadyForPickup();
    const pickupDetails = useSelfPickupDetails(selfPickupId);
    const addItemMidflow = useAddSelfPickupItemMidflow();

    const [step, setStep] = useState<ScanStep>("scanning");
    const [manualQr, setManualQr] = useState("");
    const [batchQuantity, setBatchQuantity] = useState(1);
    const [cameraActive, setCameraActive] = useState(false);
    const [finalizeOpen, setFinalizeOpen] = useState(false);
    const [finalizeReason, setFinalizeReason] = useState("");
    const [addItemOpen, setAddItemOpen] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const lastScanRef = useRef<number>(0);
    const autoFlipRef = useRef<boolean>(false);

    const progressData = progress.data?.data;
    const assets = progressData?.assets || [];
    const pickupStatus = (progressData as any)?.self_pickup_status;
    const pickup = pickupDetails.data?.data;
    const pricingMode = pickup?.pricing_mode as "STANDARD" | "NO_COST" | undefined;
    const isNoCost = pricingMode === "NO_COST";
    const companyId = pickup?.company_id as string | undefined;

    // Auto-flip CONFIRMED → READY_FOR_PICKUP on load. Prevents the
    // "Must be READY_FOR_PICKUP" 400 deep-linkers used to hit when they
    // jumped straight to the scanner page without clicking "Ready for
    // Pickup" on the detail page. One-shot guard to avoid re-fire loops.
    useEffect(() => {
        if (pickupStatus === "CONFIRMED" && !autoFlipRef.current && !markReady.isPending) {
            autoFlipRef.current = true;
            markReady.mutate(selfPickupId, {
                onSuccess: () => {
                    toast.success("Marked ready for pickup");
                    progress.refetch();
                },
                onError: (e: any) => {
                    autoFlipRef.current = false;
                    toast.error("Failed to auto-mark ready", {
                        description: e?.response?.data?.message || e.message,
                    });
                },
            });
        }
    }, [pickupStatus, markReady, selfPickupId, progress]);

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

    // Finalize PARTIAL handover (F1 + F2) — called when client took fewer
    // items than ordered. Gated NO_COST-only at the API layer; the UI hides
    // the button on STANDARD pickups so warehouse doesn't get confused.
    const handleFinalizePartial = () => {
        if (!isNoCost) return;
        if (finalizeReason.trim().length < 5) {
            toast.error("Please enter a reason (min 5 characters)");
            return;
        }
        const items = assets.map((a: any) => ({
            self_pickup_item_id: a.self_pickup_item_id,
            scanned_quantity: a.scanned_quantity,
        }));
        completeScan.mutate(
            {
                selfPickupId,
                allow_partial: true,
                partial_reason: finalizeReason.trim(),
                items,
            },
            {
                onSuccess: () => {
                    setFinalizeOpen(false);
                    setStep("complete");
                    toast.success("Partial handover complete");
                    setTimeout(() => router.push(`/self-pickups/${selfPickupId}`), 1500);
                },
                onError: (error: any) => {
                    toast.error("Cannot finalize", {
                        description: error?.response?.data?.message || error.message,
                    });
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
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold font-mono">PICKUP HANDOVER</h1>
                    <p className="text-sm text-muted-foreground">{progressData.self_pickup_id}</p>
                </div>
            </div>

            <Progress value={progressData.percent_complete} className="h-3" />
            <p className="text-center text-sm font-mono">
                {progressData.items_scanned} / {progressData.total_items} items (
                {progressData.percent_complete}%)
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
                    <Input
                        placeholder="QR code"
                        value={manualQr}
                        onChange={(e) => setManualQr(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualScan()}
                    />
                    <Input
                        type="number"
                        min={1}
                        value={batchQuantity}
                        onChange={(e) => setBatchQuantity(Number(e.target.value))}
                        className="w-20"
                        placeholder="Qty"
                    />
                    <Button onClick={handleManualScan} disabled={!manualQr.trim()}>
                        Scan
                    </Button>
                </div>
            </Card>

            {/* Item list */}
            <div className="space-y-2">
                {assets.map((asset: any) => (
                    <div
                        key={asset.asset_id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                    >
                        <div>
                            <p className="font-medium text-sm">
                                {asset.asset_name}
                                {asset.added_midflow && (
                                    <Badge variant="outline" className="ml-2 text-[10px]">
                                        ADDED
                                    </Badge>
                                )}
                            </p>
                            <p className="text-xs text-muted-foreground">{asset.tracking_method}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-mono">
                                {asset.scanned_quantity}/{asset.required_quantity}
                            </span>
                            {asset.is_complete ? (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                            ) : (
                                <Package className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Mid-flow add-item button — NO_COST-only, CONFIRMED/READY_FOR_PICKUP.
                UI hides on STANDARD so warehouse doesn't get a "not available"
                error — the API layer enforces it either way. */}
            {isNoCost && (
                <Button onClick={() => setAddItemOpen(true)} variant="outline" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add item (extra requested)
                </Button>
            )}

            {/* Two-button footer at <100%: Finalize-partial (NO_COST) OR keep scanning.
                At 100%: single CONFIRM HANDOVER button (legacy path). */}
            {progressData.percent_complete === 100 ? (
                <Button
                    onClick={handleComplete}
                    disabled={completeScan.isPending}
                    className="w-full"
                    size="lg"
                >
                    {completeScan.isPending ? "COMPLETING..." : "CONFIRM HANDOVER"}
                </Button>
            ) : isNoCost ? (
                <Button
                    onClick={() => setFinalizeOpen(true)}
                    variant="secondary"
                    className="w-full"
                    size="lg"
                >
                    Finalize with partial / skipped items
                </Button>
            ) : null}

            {/* Finalize partial handover dialog (F1 + F2). Client took less
                than ordered — confirm per-item qty + reason. */}
            <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Finalize partial handover</DialogTitle>
                        <DialogDescription>
                            Client took fewer items than ordered. Confirm what was actually
                            collected per line and note the reason.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-64 overflow-auto border rounded p-3 bg-muted/30">
                        {assets.map((a: any) => {
                            const short = a.scanned_quantity < a.required_quantity;
                            return (
                                <div
                                    key={a.asset_id}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="truncate">{a.asset_name}</span>
                                    <span
                                        className={`font-mono ${short ? "text-amber-700" : "text-muted-foreground"}`}
                                    >
                                        Ordered {a.required_quantity} → Collected{" "}
                                        {a.scanned_quantity}
                                        {a.scanned_quantity === 0 && " (skipped)"}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <Textarea
                        placeholder="Why is this partial? e.g. 'Car too small for all chairs'"
                        value={finalizeReason}
                        onChange={(e) => setFinalizeReason(e.target.value)}
                        rows={3}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setFinalizeOpen(false)}
                            disabled={completeScan.isPending}
                        >
                            Keep scanning
                        </Button>
                        <Button
                            onClick={handleFinalizePartial}
                            disabled={completeScan.isPending || finalizeReason.trim().length < 5}
                        >
                            {completeScan.isPending ? "Finalizing…" : "Confirm partial"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add item mid-flow dialog (F3) */}
            <AddMidflowItemDialog
                open={addItemOpen}
                onOpenChange={setAddItemOpen}
                selfPickupId={selfPickupId}
                companyId={companyId}
                onAdded={() => {
                    toast.success("Item added to pickup");
                    progress.refetch();
                    setAddItemOpen(false);
                }}
                mutation={addItemMidflow}
            />
        </div>
    );
}

function AddMidflowItemDialog({
    open,
    onOpenChange,
    selfPickupId,
    companyId,
    onAdded,
    mutation,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    selfPickupId: string;
    companyId: string | undefined;
    onAdded: () => void;
    mutation: ReturnType<typeof useAddSelfPickupItemMidflow>;
}) {
    const [search, setSearch] = useState("");
    const [picked, setPicked] = useState<{
        id: string;
        name: string;
        available_quantity: number;
    } | null>(null);
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState("");
    const results = useSearchAssets(search, companyId);

    useEffect(() => {
        if (!open) {
            setSearch("");
            setPicked(null);
            setQty(1);
            setReason("");
        }
    }, [open]);

    const submit = () => {
        if (!picked) {
            toast.error("Pick an asset first");
            return;
        }
        if (qty < 1 || qty > picked.available_quantity) {
            toast.error(`Qty must be 1-${picked.available_quantity}`);
            return;
        }
        if (reason.trim().length < 5) {
            toast.error("Enter a reason (min 5 chars)");
            return;
        }
        mutation.mutate(
            {
                selfPickupId,
                asset_id: picked.id,
                quantity: qty,
                reason: reason.trim(),
            },
            {
                onSuccess: () => onAdded(),
                onError: (e: any) =>
                    toast.error("Add failed", {
                        description: e?.response?.data?.message || e.message,
                    }),
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add item mid-handover</DialogTitle>
                    <DialogDescription>
                        Add a new asset to this pickup. Only available on No-Cost pickups.
                    </DialogDescription>
                </DialogHeader>
                <Input
                    placeholder="Search asset by name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search.length >= 2 && (
                    <div className="border rounded max-h-48 overflow-auto">
                        {(results.data?.data || [])
                            .filter((a: any) => a.available_quantity > 0)
                            .slice(0, 15)
                            .map((a: any) => (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() =>
                                        setPicked({
                                            id: a.id,
                                            name: a.name,
                                            available_quantity: a.available_quantity,
                                        })
                                    }
                                    className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between text-sm ${
                                        picked?.id === a.id ? "bg-muted" : ""
                                    }`}
                                >
                                    <span className="truncate">{a.name}</span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {a.available_quantity} avail
                                    </span>
                                </button>
                            ))}
                        {results.data?.data?.length === 0 && !results.isLoading && (
                            <p className="p-3 text-sm text-muted-foreground">No assets found</p>
                        )}
                    </div>
                )}
                {picked && (
                    <div className="space-y-2">
                        <div className="text-sm">
                            Picked: <span className="font-medium">{picked.name}</span>
                            <span className="text-muted-foreground">
                                {" "}
                                ({picked.available_quantity} available)
                            </span>
                        </div>
                        <Input
                            type="number"
                            min={1}
                            max={picked.available_quantity}
                            value={qty}
                            onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                        />
                    </div>
                )}
                <Textarea
                    placeholder="Reason (min 5 chars) — e.g. 'Client asked for extra chair on-site'"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                />
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={mutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={
                            !picked ||
                            qty < 1 ||
                            qty > (picked?.available_quantity ?? 0) ||
                            reason.trim().length < 5 ||
                            mutation.isPending
                        }
                    >
                        {mutation.isPending ? "Adding…" : "Add to pickup"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
