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
import { AddCustomLineItemModal } from "./AddCustomLineItemModal";
import { VehicleUpgradeSelector } from "./VehicleUpgradeSelector";
import { canManageLineItems } from "@/lib/order-helpers";
import type { OrderPricing, VehicleType } from "@/types/hybrid-pricing";
import { LogisticsPricing } from "./LogisticsPricing";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { WAREHOUSE_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { MaintenancePromptCard } from "./MaintenancePromptCard";

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
    const { user } = useToken();
    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [addCustomOpen, setAddCustomOpen] = useState(false);
    const canManagePricing = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.ordersPricingAdjust);
    const canManageServiceItems = canManageLineItems(order?.order_status) && canManagePricing;

    const pricing = order?.order_pricing as OrderPricing | undefined;
    const hasRebrandRequests = order?.items?.some((item: any) => item.isReskinRequest);
    const damagedItemCount =
        order?.items?.filter((item: any) => {
            const condition = item?.asset?.condition || item?.condition || "";
            return condition === "ORANGE" || condition === "RED";
        }).length || 0;

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
                            Admin or Logistics can process rebrand pricing in this phase.
                            Fabrication completion happens later in AWAITING_FABRICATION.
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
                    {canManagePricing ? (
                        <VehicleUpgradeSelector
                            orderId={orderId}
                            currentVehicle={order?.vehicle_type_id}
                            currentTripType={order?.trip_type}
                            onSuccess={onSubmitSuccess}
                        />
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            You can view pricing details but cannot modify transport settings.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Service Line Items */}
            <MaintenancePromptCard
                damagedItemCount={damagedItemCount}
                canManage={canManageServiceItems}
                onAddCustomLine={() => setAddCustomOpen(true)}
            />

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Service Line Items</CardTitle>
                        {canManageServiceItems && (
                            <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => setAddCatalogOpen(true)}>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Catalog Service
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setAddCustomOpen(true)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Custom Service
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <OrderLineItemsList
                        targetId={orderId}
                        canManage={
                            canManageLineItems(order?.orderStatus || order?.order_status) &&
                            canManagePricing
                        }
                    />
                    <p className="text-xs text-muted-foreground mt-3">
                        Add catalog or custom services. Custom totals are derived as qty × unit
                        rate.
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
            <AddCustomLineItemModal
                open={addCustomOpen}
                onOpenChange={setAddCustomOpen}
                orderId={orderId}
            />
        </div>
    );
}
