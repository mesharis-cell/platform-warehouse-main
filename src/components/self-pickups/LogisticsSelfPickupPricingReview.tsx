"use client";

/**
 * Logistics Self-Pickup Pricing Review.
 * Direct port of components/orders/LogisticsPricingReview.tsx — identical card
 * layout, same Add Catalog / Request Line Item buttons, same OrderLineItemsList
 * rendering, same pricing overview treatment. Only the targetId + purposeType
 * swap (ORDER → SELF_PICKUP) + line-item management rule (PRICING_REVIEW +
 * PENDING_APPROVAL) differ.
 * See SP7 in .claude/plans/tender-knitting-avalanche.md.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { OrderLineItemsList } from "@/components/orders/OrderLineItemsList";
import { AddCatalogLineItemModal } from "@/components/orders/AddCatalogLineItemModal";
import { RequestLineItemModal } from "@/components/orders/RequestLineItemModal";
import { LogisticsPricing } from "@/components/orders/LogisticsPricing";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { WAREHOUSE_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import type { OrderPricing } from "@/types/hybrid-pricing";

interface LogisticsSelfPickupPricingReviewProps {
    selfPickupId: string;
    pickup: any;
    onSubmitSuccess?: () => void;
}

const LINE_ITEM_MANAGEABLE_STATUSES = ["PRICING_REVIEW", "PENDING_APPROVAL"];

export function LogisticsSelfPickupPricingReview({
    selfPickupId,
    pickup,
    onSubmitSuccess,
}: LogisticsSelfPickupPricingReviewProps) {
    const { user } = useToken();
    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [requestLineItemOpen, setRequestLineItemOpen] = useState(false);
    // Reuse orders' pricing:adjust permission — shared across entity types.
    const canManagePricing = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.ordersPricingAdjust);
    const canManageServiceItems =
        LINE_ITEM_MANAGEABLE_STATUSES.includes(pickup?.self_pickup_status) && canManagePricing;

    const pricing = pickup?.self_pickup_pricing as OrderPricing | undefined;

    // LogisticsPricing expects an "order-like" shape — pass a shim so it
    // renders correctly (it reads calculated_totals.volume + order_status).
    const pricingOrderShim = {
        id: selfPickupId,
        order_status: pickup?.self_pickup_status,
        calculated_totals: pickup?.calculated_totals,
    };

    return (
        <div className="space-y-6">
            {/* Service Line Items */}
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
                                    onClick={() => setRequestLineItemOpen(true)}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Request Line Item
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <OrderLineItemsList
                        targetId={selfPickupId}
                        purposeType="SELF_PICKUP"
                        canManage={canManageServiceItems}
                    />
                    <p className="text-xs text-muted-foreground mt-3">
                        Add catalog services for pricing, or request a new line item for Platform
                        Admin approval.
                    </p>
                </CardContent>
            </Card>

            {pricing && (
                <LogisticsPricing
                    pricing={pricing}
                    order={pricingOrderShim}
                    onRefresh={onSubmitSuccess}
                />
            )}

            {/* Modals */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={selfPickupId}
                purposeType="SELF_PICKUP"
            />
            <RequestLineItemModal
                open={requestLineItemOpen}
                onOpenChange={setRequestLineItemOpen}
                targetId={selfPickupId}
                purposeType="SELF_PICKUP"
            />
        </div>
    );
}
