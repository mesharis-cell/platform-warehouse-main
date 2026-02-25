"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
    ArrowLeft,
    CheckCircle2,
    ClipboardList,
    Loader2,
    Package,
    X,
    Wrench,
    AlertTriangle,
    ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
    useServiceRequestDetails,
    useUpdateServiceRequest,
    useUpdateServiceRequestStatus,
    useCancelServiceRequest,
} from "@/hooks/use-service-requests";
import { useAsset } from "@/hooks/use-assets";
import { StatusHistoryTimeline } from "@/components/orders/StatusHistoryTimeline";
import { PhotoCaptureStrip, PhotoEntry } from "@/components/shared/photo-capture-strip";

function conditionBadgeClass(condition: string) {
    if (condition === "RED") return "bg-red-500/10 text-red-600 border-red-500/30";
    if (condition === "ORANGE") return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
    if (status === "COMPLETED") return "default";
    if (status === "CANCELLED") return "destructive";
    if (status === "IN_PROGRESS") return "secondary";
    return "outline";
}

export default function ServiceRequestDetailsPage() {
    const params = useParams<{ id: string }>();
    const srId = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const { data, isLoading, refetch } = useServiceRequestDetails(srId || null);
    const request = data?.data;

    const { data: assetData } = useAsset(request?.related_asset_id ?? "");
    const asset = assetData?.data;
    const latestCondition = asset?.condition_history?.[0];

    const updateRequest = useUpdateServiceRequest();
    const updateStatus = useUpdateServiceRequestStatus();
    const cancelRequest = useCancelServiceRequest();

    // Work notes — initialised once when SR data first loads
    const [workNotes, setWorkNotes] = useState("");
    const workNotesInitialised = useRef(false);
    useEffect(() => {
        if (request && !workNotesInitialised.current) {
            setWorkNotes(request.work_notes ?? "");
            workNotesInitialised.current = true;
        }
    }, [request]);

    // Work photos — initialised once when SR data first loads
    const [workPhotos, setWorkPhotos] = useState<PhotoEntry[]>([]);
    const photosInitialised = useRef(false);
    useEffect(() => {
        if (request && !photosInitialised.current && request.photos?.length) {
            setWorkPhotos(
                request.photos.map((url) => ({ previewUrl: url, note: "", uploadedUrl: url }))
            );
            photosInitialised.current = true;
        }
    }, [request]);

    // Complete modal state
    const [showCompleteSheet, setShowCompleteSheet] = useState(false);
    const [completionNotes, setCompletionNotes] = useState("");

    // Cancel state
    const [showCancelForm, setShowCancelForm] = useState(false);
    const [cancellationReason, setCancellationReason] = useState("");

    const saveWorkNotes = async () => {
        if (!request) return;
        try {
            await updateRequest.mutateAsync({ id: request.id, payload: { work_notes: workNotes } });
            toast.success("Notes saved");
        } catch {
            toast.error("Failed to save notes");
        }
    };

    const saveWorkPhotos = async () => {
        if (!request) return;
        const urls = workPhotos.map((p) => p.uploadedUrl ?? p.previewUrl).filter(Boolean);
        try {
            await updateRequest.mutateAsync({ id: request.id, payload: { photos: urls } });
            toast.success("Photos saved");
        } catch {
            toast.error("Failed to save photos");
        }
    };

    const handleStartWork = async () => {
        if (!request) return;
        try {
            await updateStatus.mutateAsync({
                id: request.id,
                payload: { to_status: "IN_PROGRESS", note: "Work started" },
            });
            toast.success("Status updated to In Progress");
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to update status");
        }
    };

    const handleComplete = async () => {
        if (!request) return;
        try {
            await updateStatus.mutateAsync({
                id: request.id,
                payload: {
                    to_status: "COMPLETED",
                    completion_notes: completionNotes.trim() || undefined,
                },
            });
            toast.success("Service request completed — asset condition set to GREEN");
            setShowCompleteSheet(false);
            setCompletionNotes("");
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to complete SR");
        }
    };

    const handleCancel = async () => {
        if (!request) return;
        if (cancellationReason.trim().length < 10)
            return toast.error("Cancellation reason must be at least 10 characters");
        try {
            await cancelRequest.mutateAsync({
                id: request.id,
                payload: { cancellation_reason: cancellationReason.trim() },
            });
            toast.success("Service request cancelled");
            setShowCancelForm(false);
            setCancellationReason("");
            refetch();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to cancel");
        }
    };

    if (isLoading)
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    if (!request)
        return <div className="p-6 text-destructive font-mono">Service request not found.</div>;

    const isTerminal =
        request.request_status === "COMPLETED" || request.request_status === "CANCELLED";
    const canAct = !isTerminal;

    return (
        <div className="min-h-screen bg-background pb-40">
            {/* Header */}
            <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/service-requests">
                            <Button variant="ghost" size="sm" className="font-mono gap-1.5">
                                <ArrowLeft className="h-4 w-4" />
                                SRs
                            </Button>
                        </Link>
                        <Separator orientation="vertical" className="h-5" />
                        <div>
                            <p className="font-mono font-bold text-sm">
                                {request.service_request_id}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                                {request.title}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant="outline" className="font-mono text-xs">
                            {request.request_type}
                        </Badge>
                        <Badge
                            variant={statusBadgeVariant(request.request_status)}
                            className="font-mono text-xs"
                        >
                            {request.request_status.replace(/_/g, " ")}
                        </Badge>
                    </div>
                </div>

                {/* Context chips */}
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {request.related_order_id && (
                        <Link
                            href={`/orders/${request.related_order_id}`}
                            className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline border border-primary/30 rounded-md px-2 py-1"
                        >
                            <ClipboardList className="w-3 h-3" />
                            Linked Order
                        </Link>
                    )}
                    {request.related_asset_id && (
                        <Link
                            href={`/assets/${request.related_asset_id}`}
                            className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline border border-primary/30 rounded-md px-2 py-1"
                        >
                            <Package className="w-3 h-3" />
                            {asset?.name ?? "Linked Asset"}
                        </Link>
                    )}
                </div>
            </div>

            <div className="px-4 py-4 space-y-4">
                {/* Asset Condition Card */}
                {asset && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="font-mono text-xs uppercase flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Asset Condition
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Badge
                                    variant="outline"
                                    className={`font-mono text-sm ${conditionBadgeClass(asset.condition)}`}
                                >
                                    {asset.condition}
                                </Badge>
                                {asset.refurb_days_estimate != null && (
                                    <span className="text-sm text-muted-foreground font-mono">
                                        ~{asset.refurb_days_estimate} refurb days
                                    </span>
                                )}
                            </div>

                            {latestCondition?.notes && (
                                <p className="text-sm text-muted-foreground italic">
                                    &quot;{latestCondition.notes}&quot;
                                </p>
                            )}

                            {latestCondition?.photos && latestCondition.photos.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs font-mono font-bold uppercase text-muted-foreground">
                                        Damage Photos
                                    </p>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {latestCondition.photos.map((url, i) => (
                                            <img
                                                key={i}
                                                src={url}
                                                alt={`Damage photo ${i + 1}`}
                                                className="w-20 h-20 shrink-0 rounded-lg object-cover border border-border"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Items Card */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-mono text-xs uppercase flex items-center gap-2">
                            <Wrench className="w-4 h-4" />
                            Service Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {request.items?.length ? (
                            request.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start justify-between border rounded-lg p-3"
                                >
                                    <div>
                                        {item.asset_id ? (
                                            <Link
                                                href={`/assets/${item.asset_id}`}
                                                className="font-medium text-sm text-primary hover:underline"
                                            >
                                                {item.asset_name}
                                            </Link>
                                        ) : (
                                            <p className="font-medium text-sm">{item.asset_name}</p>
                                        )}
                                        {item.refurb_days_estimate != null && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                ~{item.refurb_days_estimate} refurb days
                                            </p>
                                        )}
                                        {item.notes && (
                                            <p className="text-xs text-muted-foreground mt-0.5 italic">
                                                {item.notes}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-sm text-muted-foreground font-mono">
                                        ×{item.quantity}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">No items.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Work Documentation Card */}
                {canAct && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="font-mono text-xs uppercase flex items-center gap-2">
                                <ImageIcon className="w-4 h-4" />
                                Work Documentation
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase">Work Notes</Label>
                                <Textarea
                                    value={workNotes}
                                    onChange={(e) => setWorkNotes(e.target.value)}
                                    placeholder="Describe what work was done, materials used, observations…"
                                    rows={4}
                                    className="resize-none font-mono text-sm"
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={saveWorkNotes}
                                    disabled={updateRequest.isPending}
                                    className="font-mono text-xs"
                                >
                                    {updateRequest.isPending ? "Saving…" : "Save Notes"}
                                </Button>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <PhotoCaptureStrip
                                    photos={workPhotos}
                                    onChange={setWorkPhotos}
                                    label="Work Photos"
                                    uploadOnCapture
                                    companyId={request.company_id}
                                />
                                {workPhotos.length > 0 && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={saveWorkPhotos}
                                        disabled={updateRequest.isPending}
                                        className="font-mono text-xs"
                                    >
                                        {updateRequest.isPending ? "Saving…" : "Save Photos"}
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Completion summary */}
                {request.request_status === "COMPLETED" && (
                    <Card className="border-emerald-500/30 bg-emerald-500/5">
                        <CardContent className="p-4 space-y-1">
                            <p className="text-sm font-semibold text-emerald-700 font-mono">
                                COMPLETED
                            </p>
                            {request.completed_at && (
                                <p className="text-xs text-muted-foreground">
                                    {new Date(request.completed_at).toLocaleString()}
                                </p>
                            )}
                            {request.completion_notes && (
                                <p className="text-sm mt-2 italic">{request.completion_notes}</p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Cancel form */}
                {showCancelForm && (
                    <Card className="border-destructive/30">
                        <CardContent className="p-4 space-y-3">
                            <p className="text-sm font-mono font-bold text-destructive">
                                Cancel Service Request
                            </p>
                            <Textarea
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                placeholder="Reason for cancellation (min 10 characters)…"
                                rows={3}
                                className="resize-none text-sm"
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowCancelForm(false)}
                                    className="flex-1 font-mono"
                                >
                                    Back
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={cancelRequest.isPending}
                                    className="flex-1 font-mono"
                                >
                                    {cancelRequest.isPending ? "Cancelling…" : "Confirm Cancel"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Complete sheet overlay */}
                {showCompleteSheet && (
                    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col justify-end">
                        <div className="bg-background rounded-t-2xl p-5 space-y-4 border-t border-border">
                            <div className="flex items-center justify-between">
                                <p className="font-mono font-bold text-sm uppercase">
                                    Mark Complete
                                </p>
                                <button type="button" onClick={() => setShowCompleteSheet(false)}>
                                    <X className="w-5 h-5 text-muted-foreground" />
                                </button>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase">
                                    Completion Notes
                                </Label>
                                <Textarea
                                    value={completionNotes}
                                    onChange={(e) => setCompletionNotes(e.target.value)}
                                    placeholder="What was done? Any follow-up needed? (optional)"
                                    rows={4}
                                    autoFocus
                                    className="resize-none"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                                Asset condition will be automatically set to GREEN on completion.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 font-mono"
                                    onClick={() => setShowCompleteSheet(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 font-mono"
                                    onClick={handleComplete}
                                    disabled={updateStatus.isPending}
                                >
                                    {updateStatus.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                    )}
                                    Complete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status History */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-mono text-xs uppercase">
                            Status History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <StatusHistoryTimeline
                            entries={(request.status_history || []).map((entry, idx, arr) => ({
                                id: entry.id,
                                label: entry.from_status
                                    ? `${entry.from_status.replace(/_/g, " ")} → ${entry.to_status.replace(/_/g, " ")}`
                                    : entry.to_status.replace(/_/g, " "),
                                timestamp: entry.changed_at,
                                user: entry.changed_by_user?.name || entry.changed_by || null,
                                note: entry.note || null,
                                isActive: idx === arr.length - 1,
                            }))}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Sticky action bar */}
            {canAct && (
                <div className="fixed bottom-16 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
                    <div className="p-4 space-y-2">
                        {request.request_status === "SUBMITTED" && (
                            <Button
                                className="w-full font-mono"
                                onClick={handleStartWork}
                                disabled={updateStatus.isPending}
                            >
                                {updateStatus.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Wrench className="w-4 h-4 mr-2" />
                                )}
                                Start Work
                            </Button>
                        )}

                        {request.request_status === "IN_PROGRESS" && (
                            <Button
                                className="w-full font-mono"
                                onClick={() => setShowCompleteSheet(true)}
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark Complete
                            </Button>
                        )}

                        {!showCancelForm && (
                            <button
                                type="button"
                                onClick={() => setShowCancelForm(true)}
                                className="w-full text-center text-xs text-destructive font-mono py-1 hover:underline"
                            >
                                Cancel SR
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Desktop action bar (visible on lg+) */}
            {canAct && (
                <div className="hidden lg:block fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur">
                    <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3">
                        {request.request_status === "SUBMITTED" && (
                            <Button
                                onClick={handleStartWork}
                                disabled={updateStatus.isPending}
                                className="font-mono"
                            >
                                {updateStatus.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Wrench className="w-4 h-4 mr-2" />
                                )}
                                Start Work
                            </Button>
                        )}
                        {request.request_status === "IN_PROGRESS" && (
                            <Button
                                onClick={() => setShowCompleteSheet(true)}
                                className="font-mono"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark Complete
                            </Button>
                        )}
                        {!showCancelForm && (
                            <button
                                type="button"
                                onClick={() => setShowCancelForm(true)}
                                className="text-xs text-destructive font-mono hover:underline ml-auto"
                            >
                                Cancel SR
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
