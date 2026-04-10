"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export interface UnsettledLine {
    line_id: string;
    asset_id: string;
    asset_name: string;
    outbound_qty: number;
    scanned_qty: number;
    delta: number;
}

export interface SettlementEntry {
    line_id: string;
    returned_quantity: number;
    reason:
        | "POOLED_SETTLEMENT_CONSUMED"
        | "POOLED_SETTLEMENT_LOST"
        | "POOLED_SETTLEMENT_DAMAGED"
        | "POOLED_SETTLEMENT_OTHER";
    note?: string;
}

interface PooledSettlementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    unsettledLines: UnsettledLine[];
    onConfirm: (settlements: SettlementEntry[]) => void;
    isPending?: boolean;
}

const SETTLEMENT_REASONS = [
    { value: "POOLED_SETTLEMENT_CONSUMED", label: "Consumed on event" },
    { value: "POOLED_SETTLEMENT_LOST", label: "Lost / unaccounted" },
    { value: "POOLED_SETTLEMENT_DAMAGED", label: "Damaged / write-off" },
    { value: "POOLED_SETTLEMENT_OTHER", label: "Other" },
] as const;

export function PooledSettlementModal({
    open,
    onOpenChange,
    unsettledLines,
    onConfirm,
    isPending,
}: PooledSettlementModalProps) {
    const [settlements, setSettlements] = useState<
        Record<
            string,
            { reason: SettlementEntry["reason"]; note: string }
        >
    >(() => {
        const initial: Record<string, { reason: SettlementEntry["reason"]; note: string }> = {};
        unsettledLines.forEach((line) => {
            initial[line.line_id] = {
                reason: "POOLED_SETTLEMENT_CONSUMED",
                note: "",
            };
        });
        return initial;
    });

    const handleConfirm = () => {
        const entries: SettlementEntry[] = unsettledLines.map((line) => ({
            line_id: line.line_id,
            returned_quantity: line.scanned_qty,
            reason: settlements[line.line_id]?.reason || "POOLED_SETTLEMENT_CONSUMED",
            note: settlements[line.line_id]?.note || undefined,
        }));
        onConfirm(entries);
    };

    const hasOtherWithoutNote = unsettledLines.some(
        (line) =>
            settlements[line.line_id]?.reason === "POOLED_SETTLEMENT_OTHER" &&
            !settlements[line.line_id]?.note?.trim()
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Pooled Items Settlement
                    </DialogTitle>
                    <DialogDescription>
                        The following pooled items were not fully returned. Please confirm the
                        reason for each shortfall to complete the return scan.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {unsettledLines.map((line) => (
                        <div
                            key={line.line_id}
                            className="border rounded-lg p-4 space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <p className="font-medium">{line.asset_name}</p>
                                <Badge variant="outline" className="text-amber-700">
                                    {Math.abs(line.delta)} short
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Out: {line.outbound_qty} | Back: {line.scanned_qty} |
                                Delta: {line.delta}
                            </div>

                            <div className="space-y-2">
                                <Label>Reason</Label>
                                <Select
                                    value={settlements[line.line_id]?.reason}
                                    onValueChange={(value) =>
                                        setSettlements((prev) => ({
                                            ...prev,
                                            [line.line_id]: {
                                                ...prev[line.line_id],
                                                reason: value as SettlementEntry["reason"],
                                            },
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SETTLEMENT_REASONS.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Note
                                    {settlements[line.line_id]?.reason ===
                                    "POOLED_SETTLEMENT_OTHER"
                                        ? " (required)"
                                        : " (optional)"}
                                </Label>
                                <Textarea
                                    placeholder="Add details about the shortfall..."
                                    value={settlements[line.line_id]?.note || ""}
                                    onChange={(e) =>
                                        setSettlements((prev) => ({
                                            ...prev,
                                            [line.line_id]: {
                                                ...prev[line.line_id],
                                                note: e.target.value,
                                            },
                                        }))
                                    }
                                    rows={2}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isPending || hasOtherWithoutNote}
                    >
                        {isPending ? "Settling..." : "Confirm & Close"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
