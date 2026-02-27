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
    const canRecalculate = ["PRICING_REVIEW", "PENDING_APPROVAL"].includes(order?.order_status);
    const breakdownLines = Array.isArray(pricing?.breakdown_lines)
        ? pricing.breakdown_lines.filter(
              (line) => !line.is_voided && (line.billing_mode || "BILLABLE") === "BILLABLE"
          )
        : [];

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
                                        Volume: {volume.toFixed(3)} m³
                                    </span>
                                </div>
                                {canRecalculate && (
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
                                            {recalculate.isPending
                                                ? "Recalculating..."
                                                : "Recalculate"}
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="border-t border-border my-2"></div>
                            {breakdownLines.length > 0 && (
                                <div className="rounded border border-border/60 overflow-hidden">
                                    <div className="grid grid-cols-12 bg-muted/30 px-3 py-2 text-xs font-medium">
                                        <span className="col-span-8">Line</span>
                                        <span className="col-span-4 text-right">Buy Total</span>
                                    </div>
                                    {breakdownLines.map((line) => (
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
                            {pricing.calculated_at && (
                                <p className="text-xs text-muted-foreground text-right">
                                    Last calculated:{" "}
                                    {new Date(pricing.calculated_at as string).toLocaleString()}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};
