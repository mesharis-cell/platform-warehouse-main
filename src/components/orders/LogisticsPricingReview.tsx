"use client";

/**
 * Logistics Pricing Review Component
 * For PRICING_REVIEW status - Logistics adds line items and submits to Admin
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus } from "lucide-react";
import { OrderLineItemsList } from "./OrderLineItemsList";
import { AddCatalogLineItemModal } from "./AddCatalogLineItemModal";
import { VehicleUpgradeSelector } from "./VehicleUpgradeSelector";
import { canManageLineItems } from "@/lib/order-helpers";
import type { OrderPricing, VehicleType } from "@/types/hybrid-pricing";
import { LogisticsPricing } from "./LogisticsPricing";

interface LogisticsPricingReviewProps {
    orderId: string;
    order: any;
    onSubmitSuccess?: () => void;
}

export function LogisticsPricingReview({
    orderId,
    order,
    onSubmitSuccess,
}: LogisticsPricingReviewProps) {
    const [addCatalogOpen, setAddCatalogOpen] = useState(false);

    const pricing = order?.order_pricing as OrderPricing | undefined;
    const hasRebrandRequests = order?.items?.some((item: any) => item.isReskinRequest);

    return (
        <div className="space-y-6">
            {/* Rebrand Notice */}
            {hasRebrandRequests && (
                <Card className="border-amber-500/30 bg-amber-500/10">
                    <CardContent className="p-4">
                        <p className="text-sm font-semibold text-amber-500 mb-1">
                            🔄 This order includes rebrand requests
                        </p>
                        <p className="text-xs text-amber-500">
                            Admin will process rebrand requests and add costs during their approval
                            step. You can add service line items as needed before submitting.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Vehicle Type (Optional Upgrade) */}
            <Card>
                <CardHeader>
                    <CardTitle>Transport Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                    <VehicleUpgradeSelector
                        orderId={orderId}
                        currentVehicle={order?.vehicle_type_id}
                        onSuccess={onSubmitSuccess}
                    />
                </CardContent>
            </Card>

            {/* Service Line Items */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Service Line Items</CardTitle>
                        {canManageLineItems(order?.order_status) && (
                            <Button size="sm" onClick={() => setAddCatalogOpen(true)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Service
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <OrderLineItemsList
                        targetId={orderId}
                        canManage={canManageLineItems(order?.orderStatus || order?.order_status)}
                    />
                    <p className="text-xs text-muted-foreground mt-3">
                        Add services like assembly, equipment rental, etc. Custom charges will be
                        handled by Admin.
                    </p>
                </CardContent>
            </Card>

            <LogisticsPricing pricing={pricing} order={order} />

            {/* Modals */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={orderId}
            />
        </div>
    );
}
