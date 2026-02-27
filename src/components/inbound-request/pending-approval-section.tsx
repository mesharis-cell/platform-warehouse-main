"use client";

/**
 * PENDING_APPROVAL Section (Admin Review) for Inbound Requests
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Plus } from "lucide-react";
import { toast } from "sonner";
import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { AddCustomLineItemModal } from "@/components/orders/AddCustomLineItemModal";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { ReturnInboundRequestToLogisticsModal } from "./return-to-logistics-modal";
import { useAdminApproveInboundRequest } from "@/hooks/use-inbound-requests";
import type { InboundRequestDetails } from "@/types/inbound-request";

interface InboundRequestPendingApprovalSectionProps {
    request: InboundRequestDetails;
    requestId: string;
    onRefresh?: () => void;
}

export function PendingApprovalSection({
    request,
    requestId,
    onRefresh,
}: InboundRequestPendingApprovalSectionProps) {
    const adminApproveRequest = useAdminApproveInboundRequest();

    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const [returnToLogisticsOpen, setReturnToLogisticsOpen] = useState(false);

    const pricing = request.request_pricing;
    const breakdownLines = Array.isArray(pricing?.breakdown_lines)
        ? pricing.breakdown_lines.filter(
              (line: any) => !line.is_voided && (line.billing_mode || "BILLABLE") === "BILLABLE"
          )
        : [];

    const handleApprove = async () => {
        try {
            await adminApproveRequest.mutateAsync({
                id: requestId,
            });
            toast.success("Request approved and sent to client");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve request");
        }
    };

    const isPendingApproval = request.request_status === "PENDING_APPROVAL";

    return (
        <div className="space-y-6">
            {/* Service Line Items */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Service Line Items
                        </CardTitle>
                        {isPendingApproval && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddCatalogOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Catalog Service
                                </Button>
                                <Button size="sm" onClick={() => setAddCustomOpen(true)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Custom Charge
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <OrderLineItemsList
                        targetId={requestId}
                        canManage={isPendingApproval}
                        purposeType="INBOUND_REQUEST"
                    />
                </CardContent>
            </Card>

            {/* Pricing Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Final Pricing Review</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {pricing && (
                        <div className="space-y-2 text-sm">
                            {breakdownLines.length > 0 && (
                                <div className="rounded border border-border/60 overflow-hidden">
                                    <div className="grid grid-cols-12 bg-muted/30 px-3 py-2 text-xs font-medium">
                                        <span className="col-span-8">Line</span>
                                        <span className="col-span-4 text-right">Buy Total</span>
                                    </div>
                                    {breakdownLines.map((line: any) => (
                                        <div
                                            key={line.line_id}
                                            className="grid grid-cols-12 px-3 py-2 text-xs border-t border-border/40"
                                        >
                                            <span className="col-span-8 truncate">
                                                {line.label} ({line.quantity} {line.unit})
                                            </span>
                                            <span className="col-span-4 text-right font-mono">
                                                {Number(line.total ?? line.buy_total ?? 0).toFixed(
                                                    2
                                                )}{" "}
                                                AED
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between font-semibold">
                                <span>Order Total</span>
                                <span className="font-mono">
                                    {Number(
                                        pricing.totals?.total ??
                                            pricing.totals?.buy_total ??
                                            pricing.final_total ??
                                            0
                                    ).toFixed(2)}{" "}
                                    AED
                                </span>
                            </div>
                        </div>
                    )}

                    {isPendingApproval && (
                        <div>
                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={handleApprove}
                                    disabled={adminApproveRequest.isPending}
                                    className="flex-1"
                                >
                                    {adminApproveRequest.isPending
                                        ? "Approving..."
                                        : "Approve & Send Quote to Client"}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setReturnToLogisticsOpen(true)}
                                >
                                    Return to Logistics
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modals */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={requestId}
                purposeType="INBOUND_REQUEST"
            />
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                targetId={requestId}
                purposeType="INBOUND_REQUEST"
            />

            {/* Return to Logistics Modal */}
            <ReturnInboundRequestToLogisticsModal
                open={returnToLogisticsOpen}
                onOpenChange={setReturnToLogisticsOpen}
                onSuccess={onRefresh}
                requestId={requestId}
            />
        </div>
    );
}
