"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { useCreateLineItemRequest } from "@/hooks/use-line-item-requests";
import type { ServiceCategory } from "@/types/hybrid-pricing";

interface RequestLineItemModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    targetId: string;
    purposeType?: "ORDER" | "INBOUND_REQUEST" | "SERVICE_REQUEST";
}

export function RequestLineItemModal({
    open,
    onOpenChange,
    targetId,
    purposeType = "ORDER",
}: RequestLineItemModalProps) {
    const createRequest = useCreateLineItemRequest(targetId, purposeType);

    const [description, setDescription] = useState("");
    const [category, setCategory] = useState<ServiceCategory>("OTHER");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState("service");
    const [unitRate, setUnitRate] = useState("");
    const [notes, setNotes] = useState("");

    const reset = () => {
        setDescription("");
        setCategory("OTHER");
        setQuantity("1");
        setUnit("service");
        setUnitRate("");
        setNotes("");
    };

    const handleSubmit = async () => {
        const quantityValue = Number(quantity || 0);
        const unitRateValue = Number(unitRate || 0);

        if (!description.trim()) {
            toast.error("Description is required");
            return;
        }
        if (!unit.trim()) {
            toast.error("Unit is required");
            return;
        }
        if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
            toast.error("Quantity must be greater than 0");
            return;
        }
        if (!Number.isFinite(unitRateValue) || unitRateValue < 0) {
            toast.error("Unit rate must be 0 or greater");
            return;
        }

        try {
            await createRequest.mutateAsync({
                description: description.trim(),
                category,
                quantity: quantityValue,
                unit: unit.trim(),
                unitRate: unitRateValue,
                notes: notes.trim() || undefined,
            });
            toast.success("Line item request submitted to Platform Admin");
            reset();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to submit line item request");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Request Line Item</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Submit a pricing line item request. Platform Admin will review and approve
                        or reject it.
                    </p>

                    <div className="space-y-2">
                        <Label>
                            Description <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                            placeholder="e.g., Permits processing fee"
                            maxLength={200}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>
                            Category <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={category}
                            onValueChange={(value) => setCategory(value as ServiceCategory)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ASSEMBLY">ASSEMBLY</SelectItem>
                                <SelectItem value="EQUIPMENT">EQUIPMENT</SelectItem>
                                <SelectItem value="HANDLING">HANDLING</SelectItem>
                                <SelectItem value="RESKIN">RESKIN</SelectItem>
                                <SelectItem value="TRANSPORT">TRANSPORT</SelectItem>
                                <SelectItem value="OTHER">OTHER</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label>
                                Qty <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                min="1"
                                step="1"
                                value={quantity}
                                onChange={(event) => setQuantity(event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Unit <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                value={unit}
                                onChange={(event) => setUnit(event.target.value)}
                                maxLength={20}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Unit Rate <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitRate}
                                onChange={(event) => setUnitRate(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Why this line item is needed..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={createRequest.isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={createRequest.isPending}>
                        {createRequest.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
