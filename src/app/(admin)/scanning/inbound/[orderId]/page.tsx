"use client";

/**
 * Mobile Inbound Scanning Interface
 * Phase 11: QR Code Tracking System + Condition Management
 *
 * Tactical inspection HUD for warehouse return operations:
 * - Full-screen QR camera with condition inspection workflow
 * - Immediate condition assessment (GREEN/ORANGE/RED)
 * - Damage photo documentation for RED items
 * - Discrepancy tracking (BROKEN/LOST/OTHER)
 */

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PrintQrAction } from "@/components/qr/PrintQrAction";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    useInboundScanProgress,
    useScanInboundItem,
    useCompleteInboundScan,
} from "@/hooks/use-scanning";
import { useCreateServiceRequest, useListServiceRequests } from "@/hooks/use-service-requests";
import { useAdminOrderDetails } from "@/hooks/use-orders";
import { useUploadImage } from "@/hooks/use-assets";
import { APIInboundProgressResponse } from "@/types/scanning";
import { Camera, CheckCircle2, ScanLine, Package } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { TransformedAssetWarning } from "@/components/scanning/TransformedAssetWarning";
import { PhotoCaptureStrip, PhotoEntry } from "@/components/shared/photo-capture-strip";
import {
    ConditionReportPanel,
    ConditionReport,
    validateConditionReport,
} from "@/components/shared/condition-report-panel";

interface TransformedAssetInfo {
    oldAssetName: string;
    oldQrCode: string;
    newAssetName: string;
    newQrCode: string;
}

type ScanStep = "scanning" | "complete";
type InspectionState = {
    qrCode: string;
    assetId: string;
    assetName: string;
    trackingMethod: "INDIVIDUAL" | "BATCH";
    requiredQuantity: number;
    scannedQuantity: number;
    conditionReport: ConditionReport;
    latestReturnPhotos: PhotoEntry[];
    discrepancyReason: "BROKEN" | "LOST" | "OTHER" | null;
    quantity: number | null;
};

export default function InboundScanningPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;

    const [step, setStep] = useState<ScanStep>("scanning");
    const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
    const [currentInspection, setCurrentInspection] = useState<InspectionState | null>(null);
    const [lastScannedQR, setLastScannedQR] = useState<string | null>(null);
    const [manualQRInput, setManualQRInput] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [transformedAssetInfo, setTransformedAssetInfo] = useState<TransformedAssetInfo | null>(
        null
    );

    const qrScannerRef = useRef<Html5Qrcode | null>(null);
    const scannerDivRef = useRef<HTMLDivElement>(null);
    const lastScanTimeRef = useRef<number>(0);

    const scanItem = useScanInboundItem();
    const completeScan = useCompleteInboundScan();
    const createServiceRequest = useCreateServiceRequest();
    const uploadImage = useUploadImage();
    const progress = useInboundScanProgress(orderId);

    // Fetch order details (for order_item_id lookup) and existing linked SRs (to prevent duplicates)
    const orderDetail = useAdminOrderDetails(orderId);
    const linkedSRsQuery = useListServiceRequests({ related_order_id: orderId, limit: 100 });

    // Shared QR scanner init — called on permission grant and after inspection dialog closes
    const startQrScanner = async () => {
        if (qrScannerRef.current) return; // already running
        const scannerId = "qr-reader-inbound";
        const scannerDiv = document.getElementById(scannerId);
        if (!scannerDiv) {
            toast.error("Scanner initialization failed", {
                description: "Please refresh and try again",
            });
            return;
        }
        try {
            qrScannerRef.current = new Html5Qrcode(scannerId);
            await qrScannerRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    const now = Date.now();
                    if (now - lastScanTimeRef.current < 2000) return;
                    if (isScanningRef.current) return;
                    lastScanTimeRef.current = now;
                    handleCameraScanRef.current(decodedText);
                },
                undefined
            );
            setCameraActive(true);
            toast.success("Scanner ready", { description: "Point camera at QR code" });
        } catch (error) {
            console.error("Scanner initialization error:", error);
            toast.error("Failed to start scanner", {
                description: error instanceof Error ? error.message : "Unknown error",
            });
        }
    };

    // Stable ref so the QR callback closure doesn't go stale
    const isScanningRef = useRef(isScanning);
    useEffect(() => {
        isScanningRef.current = isScanning;
    }, [isScanning]);

    // Initialize scanner when permission is granted
    useEffect(() => {
        if (!cameraPermissionGranted) return;
        startQrScanner();
        return () => {
            stopCamera();
        };
    }, [cameraPermissionGranted]);

    const requestCameraPermission = async () => {
        try {
            // Check if mediaDevices API is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error(
                    "Camera API not available. Please use HTTPS or enable insecure origins in Chrome flags."
                );
            }

            // Request camera permission
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            // Stop the test stream
            stream.getTracks().forEach((track) => track.stop());

            // Mark permission as granted (triggers useEffect to initialize scanner)
            setCameraPermissionGranted(true);

            toast.success("Camera permission granted", {
                description: "Initializing scanner...",
            });
        } catch (error) {
            console.error("Camera permission error:", error);

            let errorMessage = "Please enable camera permissions in your browser settings";

            if (error instanceof Error) {
                if (error.message.includes("Camera API not available")) {
                    errorMessage =
                        "Camera requires HTTPS or Chrome flag enabled. See instructions below.";
                } else if (error.name === "NotAllowedError") {
                    errorMessage = "Camera permission denied. Please allow camera access.";
                } else if (error.name === "NotFoundError") {
                    errorMessage = "No camera found on this device.";
                } else if (error.name === "NotReadableError") {
                    errorMessage = "Camera is already in use by another application.";
                }
            }

            toast.error("Camera access failed", {
                description: errorMessage,
                duration: 5000,
            });
        }
    };

    const stopCamera = async () => {
        if (qrScannerRef.current && qrScannerRef.current.isScanning) {
            try {
                await qrScannerRef.current.stop();
                qrScannerRef.current.clear();
                qrScannerRef.current = null;
            } catch (error) {
                console.error("Error stopping QR scanner:", error);
            }
        }
        setCameraActive(false);
    };

    const handleCameraScan = async (qrCode: string) => {
        if (!progress.data) return;

        // Find asset in progress data
        const scanData = progress.data as unknown as APIInboundProgressResponse;
        const asset = scanData?.data?.assets.find((a) => a.qr_code === qrCode);

        if (!asset) {
            toast.error("Asset not found in order", {
                description: `QR code: ${qrCode}`,
            });
            return;
        }

        // Check if asset is already fully scanned
        if (asset.scanned_quantity >= asset.required_quantity) {
            toast.success("Asset already scanned", {
                description: `${asset.asset_name} - ${asset.scanned_quantity}/${asset.required_quantity} complete`,
            });
            return;
        }

        // Fully stop QR scanner before opening dialog so the camera is free for photos
        if (qrScannerRef.current) {
            try {
                if (qrScannerRef.current.isScanning) await qrScannerRef.current.stop();
                qrScannerRef.current.clear();
                qrScannerRef.current = null;
                setCameraActive(false);
            } catch (error) {
                console.error("Error stopping QR scanner:", error);
            }
        }

        // Open inspection dialog
        setCurrentInspection({
            qrCode,
            assetId: asset.asset_id,
            assetName: asset.asset_name,
            trackingMethod: asset.tracking_method,
            requiredQuantity: asset.required_quantity,
            scannedQuantity: asset.scanned_quantity,
            conditionReport: {
                condition: "GREEN",
                conditionPhotos: [],
                conditionNotes: "",
                refurbDays: null,
            },
            latestReturnPhotos: [],
            discrepancyReason: null,
            quantity: asset.tracking_method === "BATCH" ? null : 1,
        });
        setInspectionDialogOpen(true);
    };

    // Stable ref so startQrScanner closure always calls the latest handler
    const handleCameraScanRef = useRef(handleCameraScan);
    useEffect(() => {
        handleCameraScanRef.current = handleCameraScan;
    });

    const handleManualScanSubmit = () => {
        if (!manualQRInput.trim()) {
            toast.error("Please enter a QR code");
            return;
        }

        handleCameraScan(manualQRInput.trim());
        setManualQRInput("");
    };

    const resumeQrScanner = async (context: string) => {
        console.log(`📸 Restarting QR scanner (${context})`);
        await startQrScanner();
    };

    // Upload any PhotoEntry items that still have a File (not yet uploaded to S3)
    const resolvePhotoUrls = async (photos: PhotoEntry[]): Promise<string[]> => {
        return Promise.all(
            photos.map(async (p) => {
                if (p.uploadedUrl) return p.uploadedUrl;
                if (!p.file) return p.previewUrl; // already an S3 URL (existing photo)
                const fd = new FormData();
                fd.append("files", p.file);
                const res = await uploadImage.mutateAsync(fd);
                return res.data?.imageUrls?.[0] ?? p.previewUrl;
            })
        );
    };

    const handleInspectionSubmit = async () => {
        if (!currentInspection) return;

        const condErr = validateConditionReport(currentInspection.conditionReport);
        if (condErr) {
            toast.error(condErr);
            return;
        }

        const isDamagedCondition =
            currentInspection.conditionReport.condition === "ORANGE" ||
            currentInspection.conditionReport.condition === "RED";

        if (currentInspection.latestReturnPhotos.length < 2) {
            toast.error("Latest return photos required", {
                description: "Please take at least 2 photos of the returned item",
            });
            return;
        }

        if (currentInspection.trackingMethod === "BATCH" && !currentInspection.quantity) {
            toast.error("Please enter quantity");
            return;
        }

        const remainingQuantity =
            currentInspection.requiredQuantity - currentInspection.scannedQuantity;
        if (currentInspection.quantity && currentInspection.quantity > remainingQuantity) {
            toast.error("Quantity exceeds remaining amount", {
                description: `Maximum: ${remainingQuantity}`,
            });
            return;
        }

        setIsScanning(true);

        let returnPhotoUrls: string[];
        let conditionPhotoEntries: { url: string; description?: string }[] = [];
        try {
            returnPhotoUrls = await resolvePhotoUrls(currentInspection.latestReturnPhotos);
            if (isDamagedCondition) {
                const condUrls = await resolvePhotoUrls(
                    currentInspection.conditionReport.conditionPhotos
                );
                conditionPhotoEntries = condUrls.map((url, i) => ({
                    url,
                    ...(currentInspection.conditionReport.conditionPhotos[i]?.note
                        ? { description: currentInspection.conditionReport.conditionPhotos[i].note }
                        : {}),
                }));
            }
        } catch {
            toast.error("Failed to upload photos. Please try again.");
            setIsScanning(false);
            return;
        }

        const { conditionReport } = currentInspection;
        scanItem.mutate(
            {
                orderId,
                qrCode: currentInspection.qrCode,
                condition: conditionReport.condition,
                notes: conditionReport.conditionNotes || undefined,
                latestReturnImages: returnPhotoUrls,
                damageReportEntries: isDamagedCondition ? conditionPhotoEntries : undefined,
                refurbDaysEstimate: isDamagedCondition
                    ? conditionReport.refurbDays || undefined
                    : undefined,
                discrepancyReason: isDamagedCondition
                    ? currentInspection.discrepancyReason || undefined
                    : undefined,
                quantity: currentInspection.quantity || undefined,
            },
            {
                onSuccess: async (data: any) => {
                    // Handle API response structure
                    const responseData = data.data || data;
                    const asset = responseData.asset;
                    const progress = responseData.progress;
                    const redirectAsset = responseData.redirect_asset;

                    const scannedAssetName = currentInspection.assetName;
                    const scannedQrCode = currentInspection.qrCode;
                    const inspectionSnapshot = currentInspection;

                    setInspectionDialogOpen(false);
                    setCurrentInspection(null);
                    setIsScanning(false);

                    // Check if this is a transformed asset redirect
                    if (redirectAsset) {
                        setTransformedAssetInfo({
                            oldAssetName: asset?.name || scannedAssetName,
                            oldQrCode: scannedQrCode,
                            newAssetName: redirectAsset.name,
                            newQrCode: redirectAsset.qr_code,
                        });
                        toast.warning("Asset has been transformed", {
                            description: "Please scan the new QR code",
                        });
                        await resumeQrScanner("transformed-asset redirect");
                        return;
                    }

                    setLastScannedQR(scannedQrCode);

                    await resumeQrScanner("inspection success");

                    toast.success(`Scanned: ${scannedAssetName}`, {
                        description: `Condition: ${asset?.condition || "Updated"} | Status: ${asset?.status || "Updated"}`,
                    });

                    const snapshotCondition = inspectionSnapshot?.conditionReport?.condition;
                    if (
                        inspectionSnapshot &&
                        (snapshotCondition === "ORANGE" || snapshotCondition === "RED")
                    ) {
                        try {
                            const currentOrderStatus =
                                (progress.data as APIInboundProgressResponse | undefined)?.data
                                    ?.order_status || "";
                            const preQuoteStatuses = [
                                "DRAFT",
                                "PRICING_REVIEW",
                                "PENDING_APPROVAL",
                                "QUOTED",
                            ];

                            // Look up order_item_id for this asset
                            const scannedAssetId = asset?.id || inspectionSnapshot.assetId;
                            const orderItemId =
                                (orderDetail.data as any)?.data?.items?.find(
                                    (i: any) => i.asset?.id === scannedAssetId
                                )?.order_item?.id ?? null;

                            // Check for existing non-cancelled SR for this order item
                            const existingSR = orderItemId
                                ? (linkedSRsQuery.data as any)?.data?.find(
                                      (sr: any) =>
                                          sr.related_order_item_id === orderItemId &&
                                          sr.request_status !== "CANCELLED"
                                  )
                                : null;

                            if (existingSR) {
                                toast.info("Service request already exists for this item", {
                                    description: `${existingSR.service_request_id} — ${existingSR.request_status.replace(/_/g, " ")}`,
                                });
                            } else {
                                const created = await createServiceRequest.mutateAsync({
                                    request_type: "MAINTENANCE",
                                    billing_mode: "INTERNAL_ONLY",
                                    link_mode: preQuoteStatuses.includes(currentOrderStatus)
                                        ? "BUNDLED_WITH_ORDER"
                                        : "SEPARATE_CHANGE_REQUEST",
                                    blocks_fulfillment: snapshotCondition === "RED",
                                    title: `Flagged ${snapshotCondition} during inbound scan`,
                                    description:
                                        inspectionSnapshot.conditionReport.conditionNotes ||
                                        undefined,
                                    related_asset_id: scannedAssetId,
                                    related_order_id: orderId,
                                    related_order_item_id: orderItemId ?? undefined,
                                    items: [
                                        {
                                            asset_id: scannedAssetId,
                                            asset_name:
                                                asset?.name ||
                                                inspectionSnapshot.assetName ||
                                                "Scanned asset",
                                            quantity: inspectionSnapshot.quantity || 1,
                                            notes:
                                                inspectionSnapshot.conditionReport.conditionNotes ||
                                                undefined,
                                            refurb_days_estimate:
                                                inspectionSnapshot.conditionReport.refurbDays ||
                                                undefined,
                                        },
                                    ],
                                });
                                toast.success("Linked service request created", {
                                    description:
                                        created?.data?.service_request_id ||
                                        "Damage handoff logged",
                                });
                            }
                        } catch (error: any) {
                            toast.error("Scan saved but SR creation failed", {
                                description:
                                    error?.message || "Please create the service request manually",
                            });
                        }
                    }

                    setTimeout(() => setLastScannedQR(null), 2000);

                    // Complete scan if 100%
                    if (progress?.percent_complete === 100) {
                        handleCompleteScan();
                    }
                },
                onError: (error) => {
                    setIsScanning(false);
                    void resumeQrScanner("inspection error");
                    toast.error("Scan failed", {
                        description: error.message,
                    });
                },
            }
        );
    };

    const handleCompleteScan = () => {
        completeScan.mutate(
            { orderId },
            {
                onSuccess: (data: any) => {
                    setStep("complete");
                    const newStatus =
                        data.data?.new_status ||
                        data.new_status ||
                        data.data?.order_status ||
                        data.order_status ||
                        "CLOSED";
                    toast.success("Return scan complete", {
                        description: `Order ${newStatus}`,
                    });
                    setTimeout(() => {
                        router.push(`/orders/${orderId}`);
                    }, 2000);
                },
                onError: (error) => {
                    toast.error("Failed to complete scan", {
                        description: error.message,
                    });
                },
            }
        );
    };

    // Render loading state
    if (progress.isLoading || !progress.data) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="p-8 text-center space-y-4">
                    <ScanLine className="w-12 h-12 mx-auto animate-pulse text-primary" />
                    <h2 className="text-xl font-bold font-mono">LOADING SCAN PROGRESS</h2>
                    <p className="text-sm text-muted-foreground">Fetching order details...</p>
                </Card>
            </div>
        );
    }

    const scanData = progress.data as unknown as APIInboundProgressResponse;
    const progressData = scanData.data;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border bg-background sticky top-0 z-10">
                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[10px] text-primary font-mono tracking-[0.15em] uppercase mb-0.5">
                                Inbound Scan + Inspection
                            </div>
                            <div className="text-lg font-bold font-mono">
                                Order #{progressData.order_id}
                            </div>
                        </div>
                        <Badge variant="outline" className="text-primary border-primary font-mono">
                            {step.toUpperCase()}
                        </Badge>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono text-muted-foreground">
                            <span>Progress</span>
                            <span className="text-primary font-semibold">
                                {progressData.items_scanned}/{progressData.total_items} units
                            </span>
                        </div>
                        <Progress value={progressData.percent_complete} className="h-2" />
                        <div className="text-right text-xs text-primary font-bold font-mono">
                            {progressData.percent_complete}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanning Step */}
            {step === "scanning" && (
                <div className="p-4 space-y-4 max-w-2xl mx-auto">
                    {/* Camera Permission / QR Scanner */}
                    {!cameraPermissionGranted ? (
                        <div className="space-y-4">
                            <Card className="p-6 text-center space-y-4">
                                <Camera className="w-16 h-16 mx-auto text-primary" />
                                <div>
                                    <h3 className="text-lg font-bold font-mono mb-2">
                                        CAMERA ACCESS REQUIRED
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Grant camera permission to scan QR codes
                                    </p>
                                </div>
                                <Button
                                    onClick={requestCameraPermission}
                                    className="w-full h-12 text-lg font-mono font-bold"
                                >
                                    <Camera className="w-5 h-5 mr-2" />
                                    ENABLE CAMERA
                                </Button>
                            </Card>
                        </div>
                    ) : (
                        <div className="relative bg-black rounded-lg overflow-hidden border-2 border-primary/30">
                            {/* Html5Qrcode scanner container - always rendered */}
                            <div
                                id="qr-reader-inbound"
                                ref={scannerDivRef}
                                className="w-full h-full"
                            />

                            {/* Last scanned confirmation overlay */}
                            {lastScannedQR && (
                                <div className="absolute top-4 left-4 right-4 z-10">
                                    <div className="bg-primary text-black p-3 rounded-lg font-mono text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top">
                                        <CheckCircle2 className="w-5 h-5" />
                                        INSPECTION COMPLETE
                                    </div>
                                </div>
                            )}

                            {/* Loading overlay while initializing */}
                            {!cameraActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="text-center space-y-2">
                                        <ScanLine className="w-12 h-12 mx-auto animate-pulse text-primary" />
                                        <p className="text-sm font-mono">Initializing scanner...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual QR input */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground">
                            MANUAL QR CODE INPUT
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter QR code or scan..."
                                value={manualQRInput}
                                onChange={(e) => setManualQRInput(e.target.value)}
                                className="flex-1 bg-muted text-foreground px-4 py-3 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleManualScanSubmit();
                                    }
                                }}
                            />
                            <Button
                                variant="default"
                                size="icon"
                                className="shrink-0"
                                onClick={handleManualScanSubmit}
                            >
                                <ScanLine className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Assets list */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        <div className="text-xs font-mono text-muted-foreground mb-2">
                            ITEMS TO INSPECT
                        </div>
                        {progressData.assets.map((asset) => (
                            <div
                                key={asset.asset_id}
                                className={`p-3 rounded-lg border ${
                                    asset.scanned_quantity === asset.required_quantity
                                        ? "bg-primary/10 border-primary/30"
                                        : "bg-muted/20 border-border"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="font-mono text-sm font-bold">
                                            {asset.asset_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            QR: {asset.qr_code} • {asset.tracking_method}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <PrintQrAction
                                            qrCode={asset.qr_code}
                                            assetName={asset.asset_name}
                                            variant="outline"
                                            className="h-8 w-8 border-border/50"
                                        />
                                        <div className="text-right">
                                            <div className="text-sm font-mono font-bold">
                                                {asset.scanned_quantity}/{asset.required_quantity}
                                            </div>
                                            {asset.scanned_quantity === asset.required_quantity ? (
                                                <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                                            ) : (
                                                <Package className="w-5 h-5 text-muted-foreground ml-auto" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Complete scan button */}
                    {progressData.percent_complete === 100 && (
                        <Button
                            onClick={handleCompleteScan}
                            className="w-full h-14 text-lg font-mono font-bold bg-primary hover:bg-primary/90"
                            disabled={completeScan.isPending}
                        >
                            {completeScan.isPending ? "CLOSING ORDER..." : "COMPLETE RETURN SCAN"}
                        </Button>
                    )}
                </div>
            )}

            {/* Condition Inspection Dialog */}
            <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    {currentInspection && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="font-mono">
                                    CONDITION INSPECTION
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground font-mono">
                                    {currentInspection.assetName}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                    QR: {currentInspection.qrCode} •{" "}
                                    {currentInspection.trackingMethod}
                                </p>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Quantity input for BATCH assets */}
                                {currentInspection.trackingMethod === "BATCH" && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono font-bold">
                                            QUANTITY RETURNING *
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Enter quantity..."
                                            value={currentInspection.quantity || ""}
                                            onChange={(e) =>
                                                setCurrentInspection({
                                                    ...currentInspection,
                                                    quantity: parseInt(e.target.value) || null,
                                                })
                                            }
                                            className="w-full bg-muted text-foreground px-4 py-3 rounded-lg font-mono text-lg text-center focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <p className="text-xs text-muted-foreground font-mono text-center">
                                            Remaining to scan:{" "}
                                            {currentInspection.requiredQuantity -
                                                currentInspection.scannedQuantity}
                                        </p>
                                    </div>
                                )}

                                {/* Return state photos — required for ALL conditions, min 2 */}
                                <div className="space-y-2">
                                    <PhotoCaptureStrip
                                        photos={currentInspection.latestReturnPhotos}
                                        onChange={(p) =>
                                            setCurrentInspection({
                                                ...currentInspection,
                                                latestReturnPhotos: p,
                                            })
                                        }
                                        minPhotos={2}
                                        label="Return State Photos * (min 2)"
                                    />
                                </div>

                                {/* Condition + damage photos + notes + refurb */}
                                <ConditionReportPanel
                                    value={currentInspection.conditionReport}
                                    onChange={(cr) =>
                                        setCurrentInspection({
                                            ...currentInspection,
                                            conditionReport: cr,
                                        })
                                    }
                                />

                                {/* Discrepancy reason */}
                                {currentInspection.conditionReport.condition !== "GREEN" && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-mono font-bold">
                                            DISCREPANCY REASON (Optional)
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            <Button
                                                variant={
                                                    currentInspection.discrepancyReason === "BROKEN"
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    setCurrentInspection({
                                                        ...currentInspection,
                                                        discrepancyReason:
                                                            currentInspection.discrepancyReason ===
                                                            "BROKEN"
                                                                ? null
                                                                : "BROKEN",
                                                    })
                                                }
                                            >
                                                BROKEN
                                            </Button>
                                            <Button
                                                variant={
                                                    currentInspection.discrepancyReason === "LOST"
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    setCurrentInspection({
                                                        ...currentInspection,
                                                        discrepancyReason:
                                                            currentInspection.discrepancyReason ===
                                                            "LOST"
                                                                ? null
                                                                : "LOST",
                                                    })
                                                }
                                            >
                                                LOST
                                            </Button>
                                            <Button
                                                variant={
                                                    currentInspection.discrepancyReason === "OTHER"
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    setCurrentInspection({
                                                        ...currentInspection,
                                                        discrepancyReason:
                                                            currentInspection.discrepancyReason ===
                                                            "OTHER"
                                                                ? null
                                                                : "OTHER",
                                                    })
                                                }
                                            >
                                                OTHER
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="flex-col sm:flex-col gap-2">
                                <Button
                                    onClick={handleInspectionSubmit}
                                    className="w-full bg-primary hover:bg-primary/90 font-mono font-bold"
                                    disabled={
                                        currentInspection.latestReturnPhotos.length < 2 ||
                                        !!validateConditionReport(
                                            currentInspection.conditionReport
                                        ) ||
                                        (currentInspection.trackingMethod === "BATCH" &&
                                            !currentInspection.quantity) ||
                                        isScanning ||
                                        uploadImage.isPending ||
                                        scanItem.isPending
                                    }
                                >
                                    {uploadImage.isPending
                                        ? "UPLOADING..."
                                        : scanItem.isPending
                                          ? "RECORDING..."
                                          : "CONFIRM INSPECTION"}
                                </Button>
                                <Button
                                    onClick={async () => {
                                        setInspectionDialogOpen(false);
                                        setCurrentInspection(null);

                                        await resumeQrScanner("inspection cancel");
                                    }}
                                    variant="outline"
                                    className="w-full"
                                    disabled={scanItem.isPending}
                                >
                                    CANCEL
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Transformed Asset Warning Dialog */}
            {transformedAssetInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-md bg-card rounded-lg overflow-hidden">
                        <TransformedAssetWarning
                            oldAssetName={transformedAssetInfo.oldAssetName}
                            oldQrCode={transformedAssetInfo.oldQrCode}
                            newAssetName={transformedAssetInfo.newAssetName}
                            newQrCode={transformedAssetInfo.newQrCode}
                            onScanNewQr={() => {
                                setTransformedAssetInfo(null);
                                void resumeQrScanner("transformed warning closed");
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Complete Step */}
            {step === "complete" && (
                <div className="p-4 flex items-center justify-center min-h-[60vh]">
                    <Card className="p-8 text-center space-y-6 max-w-md w-full">
                        <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                            <CheckCircle2 className="w-12 h-12 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold font-mono mb-2">
                                RETURN SCAN COMPLETE
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Order closed. Redirecting to order details...
                            </p>
                        </div>
                        <div className="space-y-2 text-sm font-mono">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Items Inspected:</span>
                                <span className="font-bold text-primary">
                                    {progressData.total_items}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
