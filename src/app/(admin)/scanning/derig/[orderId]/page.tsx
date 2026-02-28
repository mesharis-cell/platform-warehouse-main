"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Camera, CheckCircle2, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAdminOrderDetails } from "@/hooks/use-orders";
import { PhotoCaptureStrip, PhotoEntry } from "@/components/shared/photo-capture-strip";
import { patchOrder } from "@/lib/api/order-api-path";

interface ItemCapture {
    photos: PhotoEntry[];
    notes: string;
}

export default function DerigCapturePage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.orderId as string;

    const { data: orderData, isLoading } = useAdminOrderDetails(orderId);
    const order = orderData?.data;

    const [captures, setCaptures] = useState<Record<string, ItemCapture>>({});
    const [saving, setSaving] = useState(false);
    const [completing, setCompleting] = useState(false);
    const getCapture = (itemId: string): ItemCapture =>
        captures[itemId] ?? { photos: [], notes: "" };

    const setPhotos = useCallback(
        (itemId: string, photos: PhotoEntry[]) =>
            setCaptures((prev) => ({
                ...prev,
                [itemId]: { ...getCapture(itemId), photos },
            })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const setNotes = (itemId: string, notes: string) =>
        setCaptures((prev) => ({
            ...prev,
            [itemId]: { ...(prev[itemId] ?? { photos: [] }), notes },
        }));

    const handleSave = async () => {
        const items = Object.entries(captures)
            .filter(([, c]) => c.photos.length > 0)
            .map(([order_item_id, c]) => ({
                order_item_id,
                photos: c.photos.map((p) => p.uploadedUrl ?? p.previewUrl),
                notes: c.notes.trim() || undefined,
            }));

        if (items.length === 0) {
            toast.error("Capture at least one photo before saving");
            return;
        }

        setSaving(true);
        try {
            await patchOrder(orderId, "/derig", { items });
            toast.success("Derig capture saved");
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to save captures");
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        // Save first
        const items = Object.entries(captures)
            .filter(([, c]) => c.photos.length > 0)
            .map(([order_item_id, c]) => ({
                order_item_id,
                photos: c.photos.map((p) => p.uploadedUrl ?? p.previewUrl),
                notes: c.notes.trim() || undefined,
            }));

        if (items.length === 0) {
            toast.error("Capture at least one photo per item before completing derig");
            return;
        }

        setCompleting(true);
        try {
            if (items.length > 0) {
                await patchOrder(orderId, "/derig", { items });
            }
            await patchOrder(orderId, "/status", {
                new_status: "AWAITING_RETURN",
                notes: "Derig completed on site",
            });
            toast.success("Derig complete — order moved to Awaiting Return");
            router.push(`/orders/${orderId}`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to complete derig");
        } finally {
            setCompleting(false);
        }
    };

    if (isLoading)
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );

    if (!order) return <div className="p-6 text-destructive font-mono">Order not found.</div>;

    if (order.order_status !== "DERIG")
        return (
            <div className="min-h-screen bg-background p-6 space-y-4">
                <p className="text-muted-foreground font-mono text-sm">
                    Order is not in DERIG status (current: {order.order_status}).
                </p>
                <Button variant="outline" onClick={() => router.push(`/orders/${orderId}`)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Order
                </Button>
            </div>
        );

    const items: any[] = order.items ?? [];
    const totalPhotos = Object.values(captures).reduce((s, c) => s + c.photos.length, 0);
    const itemsCaptured = Object.values(captures).filter((c) => c.photos.length > 0).length;

    return (
        <div className="min-h-screen bg-background pb-40">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
                <div className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/orders/${orderId}`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Order
                        </Button>
                        <Badge variant="outline" className="font-mono text-xs">
                            {itemsCaptured}/{items.length} items · {totalPhotos} photos
                        </Badge>
                    </div>
                    <div>
                        <h1 className="font-mono text-lg font-bold uppercase">Derig Capture</h1>
                        <p className="text-xs text-muted-foreground font-mono">
                            #{order.order_id} · Photograph each asset before loading
                        </p>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                <Card className="bg-purple-500/5 border-purple-500/30">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-purple-600 shrink-0" />
                            <p className="text-xs text-purple-700 font-mono">
                                Photograph every asset as-is before loading trucks. These photos are
                                your evidence record if items return damaged.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {items.map((item: any) => {
                    const orderItemId = item.order_item?.id;
                    if (!orderItemId) return null;
                    const capture = getCapture(orderItemId);
                    const hasCaptured = capture.photos.length > 0;

                    return (
                        <Card
                            key={orderItemId}
                            className={hasCaptured ? "border-emerald-500/30" : ""}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="font-mono text-sm flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {item.asset?.images?.[0] ? (
                                            <img
                                                src={item.asset.images[0]}
                                                alt={item.asset?.name}
                                                className="w-10 h-10 rounded object-cover border border-border shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                                                <Package className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        )}
                                        <span className="truncate">
                                            {item.asset?.name ?? item.order_item?.asset_name}
                                        </span>
                                    </div>
                                    {hasCaptured && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <PhotoCaptureStrip
                                    photos={capture.photos}
                                    onChange={(photos) => setPhotos(orderItemId, photos)}
                                    label="Asset Photos *"
                                    minPhotos={1}
                                    uploadOnCapture
                                    companyId={order.company?.id}
                                />
                                <Textarea
                                    value={capture.notes}
                                    onChange={(e) => setNotes(orderItemId, e.target.value)}
                                    placeholder="Optional notes about this asset's condition (before loading)…"
                                    rows={2}
                                    className="resize-none text-sm font-mono"
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Sticky bottom actions */}
            <div className="fixed bottom-16 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
                <div className="p-4 space-y-2">
                    <Button
                        className="w-full font-mono"
                        onClick={handleComplete}
                        disabled={completing || saving}
                    >
                        {completing ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                        )}
                        Complete Derig → Awaiting Return
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full font-mono text-xs"
                        onClick={handleSave}
                        disabled={saving || completing}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Save Progress
                    </Button>
                </div>
            </div>
        </div>
    );
}
