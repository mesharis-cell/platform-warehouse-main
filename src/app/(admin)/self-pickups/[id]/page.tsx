"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    useSelfPickupDetails,
    useSelfPickupStatusHistory,
    useMarkReadyForPickup,
    useSubmitForApproval,
    useUpdateSelfPickupJobNumber,
} from "@/hooks/use-self-pickups";
import { usePlatform } from "@/contexts/platform-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Phone, Mail, Clock, Package, Edit, Save, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { WorkflowRequestsCard } from "@/components/shared/workflow-requests-card";
import { EntityAttachmentsCard } from "@/components/shared/entity-attachments-card";
import { LogisticsSelfPickupPricingReview } from "@/components/self-pickups/LogisticsSelfPickupPricingReview";
import { CancelSelfPickupModal } from "@/components/self-pickups/CancelSelfPickupModal";

const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: "Submitted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    PRICING_REVIEW: {
        label: "Pricing Review",
        color: "bg-yellow-100 text-yellow-700 border-yellow-300",
    },
    PENDING_APPROVAL: {
        label: "Pending Approval",
        color: "bg-orange-100 text-orange-700 border-orange-300",
    },
    QUOTED: { label: "Quoted", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    DECLINED: { label: "Declined", color: "bg-red-100 text-red-700 border-red-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Pickup",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Picked Up", color: "bg-teal-100 text-teal-700 border-teal-300" },
    AWAITING_RETURN: {
        label: "Awaiting Return",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-200" },
};

const CANCELLABLE_STATUSES = [
    "SUBMITTED",
    "PRICING_REVIEW",
    "PENDING_APPROVAL",
    "QUOTED",
    "CONFIRMED",
    "READY_FOR_PICKUP",
];

export default function WarehouseSelfPickupDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { platform, isLoading: platformLoading } = usePlatform();
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;

    useEffect(() => {
        if (!platformLoading && !selfPickupEnabled) {
            router.replace("/orders");
        }
    }, [platformLoading, selfPickupEnabled, router]);

    const { data: pickupData, isLoading, refetch } = useSelfPickupDetails(id);
    const { data: historyData } = useSelfPickupStatusHistory(id);
    const markReady = useMarkReadyForPickup();
    const submitForApproval = useSubmitForApproval();
    const updateJobNumber = useUpdateSelfPickupJobNumber();

    const [cancelOpen, setCancelOpen] = useState(false);
    const [isEditingJobNumber, setIsEditingJobNumber] = useState(false);
    const [jobNumber, setJobNumber] = useState("");

    if (platformLoading || !selfPickupEnabled) {
        return null;
    }

    const pickup = pickupData?.data;
    const history = historyData?.data || [];

    if (pickup && !jobNumber && pickup.job_number) {
        setJobNumber(pickup.job_number);
    }

    const handleJobNumberSave = async () => {
        if (!pickup) return;
        try {
            await updateJobNumber.mutateAsync({
                id: pickup.id,
                job_number: jobNumber || null,
            });
            setIsEditingJobNumber(false);
            toast.success("Job number updated");
        } catch (error: unknown) {
            toast.error((error as Error).message || "Failed to update job number");
        }
    };

    if (isLoading)
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    if (!pickup)
        return <div className="text-center py-12 text-muted-foreground">Self-pickup not found</div>;

    const sc = PICKUP_STATUS_CONFIG[pickup.self_pickup_status] || {
        label: pickup.self_pickup_status,
        color: "bg-gray-100 text-gray-700",
    };
    const pw = pickup.pickup_window as any;
    const items = pickup.items || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/self-pickups">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{pickup.self_pickup_id}</h1>
                        <p className="text-sm text-muted-foreground">
                            {(pickup.company as any)?.name}
                        </p>
                    </div>
                    <Badge variant="outline" className={sc.color}>
                        {sc.label}
                    </Badge>
                </div>
                <div className="flex gap-2">
                    {pickup.self_pickup_status === "PRICING_REVIEW" && (
                        <Button
                            onClick={() =>
                                submitForApproval.mutate(id, {
                                    onSuccess: () => toast.success("Submitted for approval"),
                                    onError: (e: unknown) => toast.error((e as Error).message),
                                })
                            }
                            disabled={submitForApproval.isPending}
                        >
                            Submit for Approval
                        </Button>
                    )}
                    {pickup.self_pickup_status === "CONFIRMED" && (
                        <Button
                            onClick={() =>
                                markReady.mutate(id, {
                                    onSuccess: () => toast.success("Ready for pickup"),
                                    onError: (e: unknown) => toast.error((e as Error).message),
                                })
                            }
                            disabled={markReady.isPending}
                        >
                            Ready for Pickup
                        </Button>
                    )}
                    {pickup.self_pickup_status === "READY_FOR_PICKUP" && (
                        <Link href={`/scanning/self-pickup-handover/${id}`}>
                            <Button>Start Handover Scan</Button>
                        </Link>
                    )}
                    {pickup.self_pickup_status === "AWAITING_RETURN" && (
                        <Link href={`/scanning/self-pickup-return/${id}`}>
                            <Button>Start Return Scan</Button>
                        </Link>
                    )}
                    {CANCELLABLE_STATUSES.includes(pickup.self_pickup_status) && (
                        <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                            Cancel Pickup
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Collector Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{pickup.collector_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{pickup.collector_phone}</span>
                            </div>
                            {pickup.collector_email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{pickup.collector_email}</span>
                                </div>
                            )}
                            {pw && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        Pickup: {new Date(pw.start).toLocaleString()} -{" "}
                                        {new Date(pw.end).toLocaleString()}
                                    </span>
                                </div>
                            )}
                            {pickup.expected_return_at && (
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span>
                                        Expected return:{" "}
                                        {new Date(pickup.expected_return_at).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <WorkflowRequestsCard entityType="SELF_PICKUP" entityId={pickup.id} />
                    <EntityAttachmentsCard entityType="SELF_PICKUP" entityId={pickup.id} />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Items ({items.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {items.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-medium">{item.asset_name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Qty: {item.quantity} | Vol: {item.total_volume} m3
                                            </p>
                                        </div>
                                        <Badge variant="outline">
                                            <Package className="h-3 w-3 mr-1" />
                                            {item.quantity}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing review card — only when status allows logistics to
                        manage line items + submit for approval. */}
                    {["PRICING_REVIEW", "PENDING_APPROVAL"].includes(pickup.self_pickup_status) && (
                        <LogisticsSelfPickupPricingReview
                            selfPickupId={pickup.id}
                            pickup={pickup}
                            onSubmitSuccess={() => refetch()}
                        />
                    )}
                </div>

                <div className="space-y-6">
                    {/* Job Number Card — mirrors warehouse orders detail */}
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <Label className="font-mono text-xs text-muted-foreground">
                                        PLATFORM JOB NUMBER
                                    </Label>
                                    {isEditingJobNumber ? (
                                        <Input
                                            value={jobNumber}
                                            onChange={(e) => setJobNumber(e.target.value)}
                                            placeholder="JOB-XXXX"
                                            className="mt-2 font-mono"
                                        />
                                    ) : (
                                        <p className="mt-2 font-mono text-lg font-bold">
                                            {jobNumber || "—"}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    {isEditingJobNumber ? (
                                        <>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setIsEditingJobNumber(false)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                disabled={updateJobNumber.isPending}
                                                onClick={handleJobNumberSave}
                                            >
                                                {updateJobNumber.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setIsEditingJobNumber(true)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {pickup.decline_reason && (
                        <Card className="border border-destructive/30 bg-destructive/5">
                            <CardContent className="pt-6">
                                <Label className="font-mono text-xs text-destructive">
                                    DECLINE REASON
                                </Label>
                                <p className="mt-2 text-sm">{pickup.decline_reason}</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-base">Status History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history.map((entry: any) => {
                                    const ec = PICKUP_STATUS_CONFIG[entry.status] || {
                                        label: entry.status,
                                        color: "bg-gray-100 text-gray-700",
                                    };
                                    return (
                                        <div key={entry.id} className="flex gap-3 items-start">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                                            <div className="flex-1">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs ${ec.color}`}
                                                >
                                                    {ec.label}
                                                </Badge>
                                                {entry.notes && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {entry.notes}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {entry.updated_by_name} -{" "}
                                                    {new Date(entry.timestamp).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {history.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No history yet
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <CancelSelfPickupModal
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                selfPickupId={pickup.id}
                selfPickupIdReadable={pickup.self_pickup_id}
                companyName={(pickup.company as any)?.name || ""}
                currentStatus={pickup.self_pickup_status}
                itemCount={items.length}
            />
        </div>
    );
}
