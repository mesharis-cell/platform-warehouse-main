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
import { RequestLineItemModal } from "./RequestLineItemModal";
import { canManageLineItems } from "@/lib/order-helpers";
import type { OrderPricing } from "@/types/hybrid-pricing";
import { LogisticsPricing } from "./LogisticsPricing";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { WAREHOUSE_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";

interface LogisticsPricingReviewProps {
    orderId: string;
    order: any;
    onSubmitSuccess?: () => void;
}

export function LogisticsPricingReview({
    orderId,
    order,
    onSubmitSuccess: _onSubmitSuccess,
}: LogisticsPricingReviewProps) {
    const { user } = useToken();
    const [addCatalogOpen, setAddCatalogOpen] = useState(false);
    const [requestLineItemOpen, setRequestLineItemOpen] = useState(false);
    const canManagePricing = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.ordersPricingAdjust);
    const canManageServiceItems = canManageLineItems(order?.order_status) && canManagePricing;

    const pricing = order?.order_pricing as OrderPricing | undefined;
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
                        targetId={orderId}
                        canManage={
                            canManageLineItems(order?.orderStatus || order?.order_status) &&
                            canManagePricing
                        }
                    />
                    <p className="text-xs text-muted-foreground mt-3">
                        Add catalog services for pricing, or request a new line item for Platform
                        Admin approval.
                    </p>
                </CardContent>
            </Card>

            <LogisticsPricing pricing={pricing} order={order} onRefresh={_onSubmitSuccess} />

            {/* Modals */}
            <AddCatalogLineItemModal
                open={addCatalogOpen}
                onOpenChange={setAddCatalogOpen}
                targetId={orderId}
            />
            <RequestLineItemModal
                open={requestLineItemOpen}
                onOpenChange={setRequestLineItemOpen}
                targetId={orderId}
            />
        </div>
    );
}
