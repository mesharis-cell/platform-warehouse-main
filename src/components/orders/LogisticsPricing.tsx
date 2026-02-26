"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { DollarSign, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRecalculateBaseOps } from "@/hooks/use-orders";
import type { OrderPricing } from "@/types/hybrid-pricing";

export const LogisticsPricing = ({
    pricing,
    order,
    onRefresh,
}: {
    pricing: OrderPricing;
    order: any;
    onRefresh?: () => void;
}) => {
    const recalculate = useRecalculateBaseOps();
    const volume = parseFloat(order?.calculated_totals?.volume || "0");

    const handleRecalculate = async () => {
        try {
            await recalculate.mutateAsync(order.id);
            toast.success("Base operations recalculated");
            onRefresh?.();
        } catch (error: any) {
            toast.error(error.message || "Failed to recalculate");
        }
    };

    return (
        <>
            <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="">📋 Pricing Review</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">
                        Review the order details, add service line items if needed, and submit to
                        Admin for approval.
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Pricing Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!pricing && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                            <p className="text-sm font-semibold text-destructive mb-2">
                                ⚠️ Pricing calculation failed
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                                This order may be missing required pricing configuration.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Please contact your Platform Admin to complete pricing setup.
                            </p>
                        </div>
                    )}
                    {pricing && (
                        <div className="space-y-2 text-sm">
                            <div className="p-2 bg-muted/30 rounded space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Base Operations ({volume.toFixed(3)} m³)
                                    </span>
                                    <span className="font-mono">
                                        {pricing.base_ops_total || 0} AED
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    {volume === 0 && (
                                        <span className="text-xs text-amber-600">
                                            Update asset dimensions if needed
                                        </span>
                                    )}
                                    {volume > 0 && <span />}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs text-primary gap-1"
                                        onClick={handleRecalculate}
                                        disabled={recalculate.isPending}
                                    >
                                        <RefreshCw
                                            className={`h-3 w-3 ${recalculate.isPending ? "animate-spin" : ""}`}
                                        />
                                        {recalculate.isPending ? "Recalculating..." : "Recalculate"}
                                    </Button>
                                </div>
                            </div>
                            {pricing.line_items?.catalog_total ? (
                                <div className="flex justify-between p-2 bg-muted/30 rounded">
                                    <span className="text-muted-foreground">Service Line Item</span>
                                    <span className="font-mono">
                                        {pricing.line_items?.catalog_total?.toFixed(2) || 0} AED
                                    </span>
                                </div>
                            ) : null}
                            <div className="border-t border-border my-2"></div>
                            <div className="flex justify-between font-semibold">
                                <span>Estimated Total</span>
                                <span className="font-mono">{pricing.final_total || 0} AED</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};
