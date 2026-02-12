"use client";

/**
 * Hybrid Pricing Sections for Order Detail
 * Sections to be integrated into main order detail page
 */

import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { LogisticsPricingReview } from "@/components/orders/LogisticsPricingReview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

interface HybridPricingSectionProps {
    order: any;
    orderId: string;
    onRefresh?: () => void;
}

/**
 * PRICING_REVIEW Section (Logistics Review)
 */
export function PricingReviewSection({ order, orderId, onRefresh }: HybridPricingSectionProps) {
    return (
        <div className="space-y-6">
            <LogisticsPricingReview orderId={orderId} order={order} onSubmitSuccess={onRefresh} />
        </div>
    );
}

/**
 * AWAITING_FABRICATION Section
 */
export function AwaitingFabricationSection({ order, orderId }: HybridPricingSectionProps) {
    return (
        <div className="space-y-6">
            <Card className="border-blue-500 bg-blue-50">
                <CardHeader>
                    <CardTitle className="text-blue-500">⏳ Order Awaiting Fabrication</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-blue-500">
                        This order is confirmed but waiting for custom rebranding work to complete.
                        Once all fabrication is done, the order will automatically move to
                        IN_PREPARATION.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

/**
 * Cancel Order Button (shows if order can be cancelled)
 */
export function CancelOrderButton({ order, orderId }: HybridPricingSectionProps) {
    const [cancelOpen, setCancelOpen] = useState(false);

    const CANCELLABLE_STATUSES = [
        "DRAFT",
        "SUBMITTED",
        "PRICING_REVIEW",
        "PENDING_APPROVAL",
        "QUOTED",
        "CONFIRMED",
        "AWAITING_FABRICATION",
        "IN_PREPARATION",
    ];

    const canCancel = CANCELLABLE_STATUSES.includes(order.order_status);

    if (!canCancel) return null;

    return (
        <>
            <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel Order
            </Button>

            <CancelOrderModal
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                orderId={orderId}
                orderIdReadable={order.order_id}
                companyName={order.company?.name}
                currentStatus={order.order_status}
                itemCount={order.items?.length || 0}
                pendingReskinCount={
                    order.reskin_requests?.filter((r: any) => r.status === "pending").length || 0
                }
            />
        </>
    );
}
