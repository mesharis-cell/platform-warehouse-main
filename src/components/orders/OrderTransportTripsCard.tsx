"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    useCreateOrderTransportTrip,
    useDeleteOrderTransportTrip,
    useOrderTransportTrips,
    useUpdateOrderTransportTrip,
} from "@/hooks/use-order-transport-trips";
import type { TransportTripLeg } from "@/types/hybrid-pricing";

interface OrderTransportTripsCardProps {
    orderId: string;
    canManage: boolean;
}

type DraftTrip = {
    legType: TransportTripLeg;
    truckPlate: string;
    driverName: string;
    driverContact: string;
    truckSize: string;
    manpower: string;
    tailgateRequired: boolean;
    notes: string;
    sequenceNo: string;
};

const EMPTY_DRAFT: DraftTrip = {
    legType: "DELIVERY",
    truckPlate: "",
    driverName: "",
    driverContact: "",
    truckSize: "",
    manpower: "",
    tailgateRequired: false,
    notes: "",
    sequenceNo: "0",
};

export function OrderTransportTripsCard({ orderId, canManage }: OrderTransportTripsCardProps) {
    const { data: trips, isLoading } = useOrderTransportTrips(orderId);
    const createTrip = useCreateOrderTransportTrip(orderId);
    const updateTrip = useUpdateOrderTransportTrip(orderId);
    const deleteTrip = useDeleteOrderTransportTrip(orderId);
    const [draft, setDraft] = useState<DraftTrip>(EMPTY_DRAFT);

    const sortedTrips = useMemo(
        () =>
            [...(trips || [])].sort(
                (a, b) => Number(a.sequenceNo || 0) - Number(b.sequenceNo || 0)
            ),
        [trips]
    );

    const patch = async (tripId: string, updates: Partial<DraftTrip>) => {
        try {
            await updateTrip.mutateAsync({
                tripId,
                payload: {
                    ...(updates.legType !== undefined ? { legType: updates.legType } : {}),
                    ...(updates.truckPlate !== undefined ? { truckPlate: updates.truckPlate } : {}),
                    ...(updates.driverName !== undefined ? { driverName: updates.driverName } : {}),
                    ...(updates.driverContact !== undefined
                        ? { driverContact: updates.driverContact }
                        : {}),
                    ...(updates.truckSize !== undefined ? { truckSize: updates.truckSize } : {}),
                    ...(updates.manpower !== undefined
                        ? {
                              manpower:
                                  updates.manpower.trim() === ""
                                      ? undefined
                                      : Number(updates.manpower),
                          }
                        : {}),
                    ...(updates.tailgateRequired !== undefined
                        ? { tailgateRequired: updates.tailgateRequired }
                        : {}),
                    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
                    ...(updates.sequenceNo !== undefined
                        ? { sequenceNo: Number(updates.sequenceNo || 0) }
                        : {}),
                },
            });
        } catch (error: any) {
            toast.error(error.message || "Failed to update trip");
        }
    };

    const addTrip = async () => {
        try {
            await createTrip.mutateAsync({
                legType: draft.legType,
                truckPlate: draft.truckPlate.trim() || undefined,
                driverName: draft.driverName.trim() || undefined,
                driverContact: draft.driverContact.trim() || undefined,
                truckSize: draft.truckSize.trim() || undefined,
                manpower: draft.manpower.trim() === "" ? undefined : Number(draft.manpower),
                tailgateRequired: draft.tailgateRequired,
                notes: draft.notes.trim() || undefined,
                sequenceNo: Number(draft.sequenceNo || 0),
            });
            setDraft(EMPTY_DRAFT);
            toast.success("Transport trip added");
        } catch (error: any) {
            toast.error(error.message || "Failed to add trip");
        }
    };

    const removeTrip = async (tripId: string) => {
        try {
            await deleteTrip.mutateAsync(tripId);
            toast.success("Transport trip removed");
        } catch (error: any) {
            toast.error(error.message || "Failed to remove trip");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transport Trips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                    Operational truck details are managed here and are separate from pricing line
                    items.
                </p>

                {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading transport trips...</p>
                ) : sortedTrips.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transport trips added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {sortedTrips.map((trip) => (
                            <div
                                key={trip.id}
                                className="rounded-md border border-border p-3 grid grid-cols-1 md:grid-cols-4 gap-3"
                            >
                                <div className="space-y-1">
                                    <Label className="text-xs">Leg</Label>
                                    <Select
                                        value={trip.legType}
                                        disabled={!canManage}
                                        onValueChange={(value) =>
                                            patch(trip.id, { legType: value as TransportTripLeg })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DELIVERY">DELIVERY</SelectItem>
                                            <SelectItem value="PICKUP">PICKUP</SelectItem>
                                            <SelectItem value="ACCESS">ACCESS</SelectItem>
                                            <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Truck Plate</Label>
                                    <Input
                                        defaultValue={trip.truckPlate || ""}
                                        disabled={!canManage}
                                        onBlur={(event) =>
                                            patch(trip.id, { truckPlate: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Driver</Label>
                                    <Input
                                        defaultValue={trip.driverName || ""}
                                        disabled={!canManage}
                                        onBlur={(event) =>
                                            patch(trip.id, { driverName: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Driver Contact</Label>
                                    <Input
                                        defaultValue={trip.driverContact || ""}
                                        disabled={!canManage}
                                        onBlur={(event) =>
                                            patch(trip.id, { driverContact: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Truck Size</Label>
                                    <Input
                                        defaultValue={trip.truckSize || ""}
                                        disabled={!canManage}
                                        onBlur={(event) =>
                                            patch(trip.id, { truckSize: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Manpower</Label>
                                    <Input
                                        defaultValue={
                                            trip.manpower == null ? "" : String(trip.manpower)
                                        }
                                        disabled={!canManage}
                                        type="number"
                                        min={0}
                                        step={1}
                                        onBlur={(event) =>
                                            patch(trip.id, { manpower: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Sequence</Label>
                                    <Input
                                        defaultValue={String(trip.sequenceNo || 0)}
                                        disabled={!canManage}
                                        type="number"
                                        min={0}
                                        step={1}
                                        onBlur={(event) =>
                                            patch(trip.id, { sequenceNo: event.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Tailgate Required</Label>
                                    <div className="h-9 flex items-center gap-2">
                                        <Switch
                                            checked={Boolean(trip.tailgateRequired)}
                                            disabled={!canManage}
                                            onCheckedChange={(checked) =>
                                                patch(trip.id, { tailgateRequired: checked })
                                            }
                                        />
                                        {canManage ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeTrip(trip.id)}
                                                disabled={deleteTrip.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="md:col-span-4 space-y-1">
                                    <Label className="text-xs">Notes</Label>
                                    <Textarea
                                        defaultValue={trip.notes || ""}
                                        disabled={!canManage}
                                        rows={2}
                                        onBlur={(event) =>
                                            patch(trip.id, { notes: event.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {canManage ? (
                    <div className="rounded-md border border-dashed border-border p-3 space-y-3">
                        <p className="text-xs font-medium">Add Trip</p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Leg</Label>
                                <Select
                                    value={draft.legType}
                                    onValueChange={(value) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            legType: value as TransportTripLeg,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DELIVERY">DELIVERY</SelectItem>
                                        <SelectItem value="PICKUP">PICKUP</SelectItem>
                                        <SelectItem value="ACCESS">ACCESS</SelectItem>
                                        <SelectItem value="TRANSFER">TRANSFER</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Truck Plate</Label>
                                <Input
                                    value={draft.truckPlate}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            truckPlate: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Driver</Label>
                                <Input
                                    value={draft.driverName}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            driverName: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Driver Contact</Label>
                                <Input
                                    value={draft.driverContact}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            driverContact: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Truck Size</Label>
                                <Input
                                    value={draft.truckSize}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            truckSize: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Manpower</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={draft.manpower}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            manpower: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Sequence</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={draft.sequenceNo}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            sequenceNo: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Tailgate Required</Label>
                                <div className="h-9 flex items-center">
                                    <Switch
                                        checked={draft.tailgateRequired}
                                        onCheckedChange={(checked) =>
                                            setDraft((prev) => ({
                                                ...prev,
                                                tailgateRequired: checked,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-4 space-y-1">
                                <Label className="text-xs">Notes</Label>
                                <Textarea
                                    value={draft.notes}
                                    rows={2}
                                    onChange={(event) =>
                                        setDraft((prev) => ({
                                            ...prev,
                                            notes: event.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={addTrip} disabled={createTrip.isPending}>
                                {createTrip.isPending ? "Adding..." : "Add Trip"}
                            </Button>
                        </div>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
}
