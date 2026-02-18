"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useCreateCatalogLineItem } from "@/hooks/use-order-line-items";
import { useListServiceTypes } from "@/hooks/use-service-types";
import type { LineItemBillingMode, TransportLineItemMetadata } from "@/types/hybrid-pricing";

interface AddCatalogLineItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetId?: string;
    orderId?: string;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
}

export function AddCatalogLineItemModal({
    open,
    onOpenChange,
    targetId,
    orderId,
    purposeType = "ORDER",
}: AddCatalogLineItemModalProps) {
    const resolvedTargetId = targetId || orderId || "";
    const { data: serviceTypes } = useListServiceTypes({});
    const createLineItem = useCreateCatalogLineItem(resolvedTargetId, purposeType);

    const [serviceTypeId, setServiceTypeId] = useState("");
    const [billingMode, setBillingMode] = useState<LineItemBillingMode>("BILLABLE");
    const [quantity, setQuantity] = useState<number | string>(1);
    const [notes, setNotes] = useState("");

    const [tripDirection, setTripDirection] = useState<
        "DELIVERY" | "PICKUP" | "ACCESS" | "TRANSFER"
    >("DELIVERY");
    const [truckPlate, setTruckPlate] = useState("");
    const [driverName, setDriverName] = useState("");
    const [driverContact, setDriverContact] = useState("");
    const [truckSize, setTruckSize] = useState("");
    const [tailgateRequired, setTailgateRequired] = useState(false);
    const [manpower, setManpower] = useState("");
    const [transportNotes, setTransportNotes] = useState("");

    const selectedService = serviceTypes?.data?.find(
        (service: any) => service.id === serviceTypeId
    );
    const isTransportService = selectedService?.category === "TRANSPORT";

    const resetTransportMetadata = () => {
        setTripDirection("DELIVERY");
        setTruckPlate("");
        setDriverName("");
        setDriverContact("");
        setTruckSize("");
        setTailgateRequired(false);
        setManpower("");
        setTransportNotes("");
    };

    const handleServiceChange = (id: string) => {
        setServiceTypeId(id);
        setQuantity(1);
        resetTransportMetadata();
    };

    const handleAdd = async () => {
        const qty = Number(quantity);
        if (!resolvedTargetId) return toast.error("Missing target ID");
        if (!serviceTypeId || isNaN(qty) || qty <= 0)
            return toast.error("Please select a service and enter a valid quantity");

        let metadata: TransportLineItemMetadata | undefined;
        if (isTransportService) {
            const manpowerValue = manpower.trim() ? Number(manpower) : undefined;
            if (
                manpowerValue !== undefined &&
                (!Number.isInteger(manpowerValue) || manpowerValue < 0)
            )
                return toast.error("Manpower must be a non-negative integer");
            metadata = {
                trip_direction: tripDirection,
                truck_plate: truckPlate.trim() || undefined,
                driver_name: driverName.trim() || undefined,
                driver_contact: driverContact.trim() || undefined,
                truck_size: truckSize.trim() || undefined,
                tailgate_required: tailgateRequired,
                manpower: manpowerValue,
                notes: transportNotes.trim() || undefined,
            };
        }

        try {
            await createLineItem.mutateAsync({
                service_type_id: serviceTypeId,
                quantity: qty,
                billing_mode: billingMode,
                notes: notes || undefined,
                metadata,
            });
            toast.success("Service line item added");
            onOpenChange(false);
            setServiceTypeId("");
            setBillingMode("BILLABLE");
            setQuantity(1);
            setNotes("");
            resetTransportMetadata();
        } catch (error: any) {
            toast.error(error.message || "Failed to add line item");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Service Line Item</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <Label>
                            Service <span className="text-destructive">*</span>
                        </Label>
                        <Select value={serviceTypeId} onValueChange={handleServiceChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select service..." />
                            </SelectTrigger>
                            <SelectContent>
                                {serviceTypes?.data?.map((service: any) => (
                                    <SelectItem key={service.id} value={service.id}>
                                        {service.name} ({service.unit})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>
                            Billing Mode <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={billingMode}
                            onValueChange={(value) => setBillingMode(value as LineItemBillingMode)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select billing mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BILLABLE">BILLABLE</SelectItem>
                                <SelectItem value="NON_BILLABLE">NON-BILLABLE</SelectItem>
                                <SelectItem value="COMPLIMENTARY">COMPLIMENTARY</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>
                            Quantity <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            type="number"
                            step="1"
                            value={quantity}
                            onChange={(event) =>
                                event.target.value === ""
                                    ? setQuantity("")
                                    : setQuantity(Number(event.target.value))
                            }
                            placeholder="4"
                        />
                    </div>

                    {isTransportService && (
                        <div className="space-y-3 rounded-md border border-border p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Transport Metadata
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <Label>Trip Direction</Label>
                                    <Select
                                        value={tripDirection}
                                        onValueChange={(value) =>
                                            setTripDirection(
                                                value as
                                                    | "DELIVERY"
                                                    | "PICKUP"
                                                    | "ACCESS"
                                                    | "TRANSFER"
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DELIVERY">Delivery</SelectItem>
                                            <SelectItem value="PICKUP">Pickup</SelectItem>
                                            <SelectItem value="ACCESS">Access</SelectItem>
                                            <SelectItem value="TRANSFER">Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Truck License Plate</Label>
                                    <Input
                                        value={truckPlate}
                                        onChange={(e) => setTruckPlate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Driver Name</Label>
                                    <Input
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Driver Contact Number</Label>
                                    <Input
                                        value={driverContact}
                                        onChange={(e) => setDriverContact(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Truck Size</Label>
                                    <Input
                                        value={truckSize}
                                        onChange={(e) => setTruckSize(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Manpower</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={manpower}
                                        onChange={(e) => setManpower(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="catalog-transport-tailgate"
                                    checked={tailgateRequired}
                                    onCheckedChange={(value) => setTailgateRequired(!!value)}
                                />
                                <Label htmlFor="catalog-transport-tailgate">
                                    Tailgate Required
                                </Label>
                            </div>
                            <div>
                                <Label>Transport Notes</Label>
                                <Textarea
                                    value={transportNotes}
                                    onChange={(e) => setTransportNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Additional notes..."
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createLineItem.isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleAdd} disabled={createLineItem.isPending}>
                        {createLineItem.isPending ? "Adding..." : "Add Line Item"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
