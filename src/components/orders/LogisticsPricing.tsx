import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DollarSign } from "lucide-react";
import type { OrderPricing } from "@/types/hybrid-pricing";

export const LogisticsPricing = ({ pricing, order }: { pricing: OrderPricing; order: any }) => {
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
                                This order may be missing required configuration (e.g., transport
                                rate for the emirate, trip type, or vehicle type).
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Please contact your Platform Admin to add the missing transport rate
                                configuration.
                            </p>
                        </div>
                    )}
                    {pricing && (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between p-2 bg-muted/30 rounded">
                                <span className="text-muted-foreground">
                                    Base Operations ({order?.calculated_totals?.volume || 0} m³)
                                </span>
                                <span className="font-mono">{pricing.base_ops_total || 0} AED</span>
                            </div>
                            <div className="flex justify-between p-2 bg-muted/30 rounded">
                                <span className="text-muted-foreground">
                                    Transport ({order?.venue_city},{" "}
                                    {order?.trip_type === "ROUND_TRIP" ? "Round-trip" : "One-way"})
                                </span>
                                <span className="font-mono">
                                    {pricing.transport?.final_rate?.toFixed(2) || 0} AED
                                </span>
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
                                <span>Estimated Subtotal</span>
                                <span className="font-mono">
                                    {pricing.logistics_sub_total || 0} AED
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};
