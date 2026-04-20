"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAssetFamilies } from "@/hooks/use-asset-families";
import { useUpdateAsset } from "@/hooks/use-assets";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MoveToFamilyModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: {
        id: string;
        name: string;
        family_id?: string | null;
        company?: { id: string; name?: string } | null;
        family?: { stock_mode?: string } | null;
    };
    currentFamilyName?: string;
    onSuccess?: () => void;
}

export function MoveToFamilyModal({
    open,
    onOpenChange,
    asset,
    currentFamilyName,
    onSuccess,
}: MoveToFamilyModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const updateAsset = useUpdateAsset();

    const assetStockMode = asset.family?.stock_mode || null;
    const companyId = asset.company?.id || "";

    // Debounce the search input
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    // Reset state when dialog opens/closes
    useEffect(() => {
        if (open) {
            setSearchQuery("");
            setDebouncedSearch("");
            setSelectedFamilyId(null);
        }
    }, [open]);

    const queryParams = useMemo(() => {
        const params: Record<string, string> = {};
        if (companyId) params.company_id = companyId;
        if (debouncedSearch) params.search_term = debouncedSearch;
        return params;
    }, [companyId, debouncedSearch]);

    const { data: familiesData, isLoading } = useAssetFamilies(queryParams);
    const families = familiesData?.data || [];

    async function handleConfirm() {
        if (!selectedFamilyId) return;
        try {
            await updateAsset.mutateAsync({
                id: asset.id,
                data: { family_id: selectedFamilyId } as any,
            });
            toast.success("Asset moved to new family");
            onOpenChange(false);
            onSuccess?.();
        } catch {
            toast.error("Failed to move asset");
        }
    }

    const selectedFamily = families.find((f) => f.id === selectedFamilyId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-mono">Move to Another Family</DialogTitle>
                    <DialogDescription>
                        Move <span className="font-semibold">{asset.name}</span> to a different
                        asset family.
                        {currentFamilyName && (
                            <>
                                {" "}
                                Currently in{" "}
                                <span className="font-semibold">{currentFamilyName}</span>.
                            </>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search families..."
                            className="pl-10 font-mono"
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto rounded-md border border-border">
                        {isLoading ? (
                            <div className="py-8 text-center text-sm font-mono text-muted-foreground">
                                Loading families...
                            </div>
                        ) : families.length === 0 ? (
                            <div className="py-8 text-center text-sm font-mono text-muted-foreground">
                                No families found
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {families.map((family) => {
                                    const isCurrent = family.id === asset.family_id;
                                    const stockModeMismatch =
                                        assetStockMode !== null &&
                                        family.stock_mode !== assetStockMode;
                                    const isDisabled = isCurrent || stockModeMismatch;
                                    const isSelected = selectedFamilyId === family.id;

                                    return (
                                        <button
                                            key={family.id}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => setSelectedFamilyId(family.id)}
                                            className={cn(
                                                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                                isSelected && "bg-primary/10",
                                                isDisabled
                                                    ? "cursor-not-allowed opacity-50"
                                                    : "hover:bg-muted/50 cursor-pointer"
                                            )}
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                                                <Layers3 className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate font-mono text-sm font-medium">
                                                        {family.name}
                                                    </span>
                                                    {isCurrent && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="font-mono text-[10px] shrink-0"
                                                        >
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                                    <span>{family.stock_mode}</span>
                                                    {family.category?.name && (
                                                        <>
                                                            <span>-</span>
                                                            <span className="flex items-center gap-1">
                                                                <span
                                                                    className="inline-block h-2 w-2 rounded-full"
                                                                    style={{
                                                                        backgroundColor:
                                                                            family.category.color,
                                                                    }}
                                                                />
                                                                {family.category.name}
                                                            </span>
                                                        </>
                                                    )}
                                                    {stockModeMismatch && (
                                                        <span className="flex items-center gap-1 text-amber-600">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Mode mismatch
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selectedFamily && (
                        <p className="text-xs font-mono text-muted-foreground">
                            Selected: <span className="font-semibold">{selectedFamily.name}</span> (
                            {selectedFamily.stock_mode})
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="font-mono"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedFamilyId || updateAsset.isPending}
                        className="font-mono"
                    >
                        {updateAsset.isPending ? "Moving..." : "Confirm Move"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
