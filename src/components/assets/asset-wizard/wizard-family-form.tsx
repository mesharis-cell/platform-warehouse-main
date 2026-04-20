"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { CategoryCombobox } from "@/components/assets/category-combobox";
import { cn } from "@/lib/utils";
import type { WizardState } from "./types";

const HANDLING_TAGS = ["Fragile", "HighValue", "HeavyLift", "AssemblyRequired"];

interface Props {
    state: WizardState;
    update: (fields: Partial<WizardState>) => void;
}

export function WizardFamilyForm({ state, update }: Props) {
    const [brandOpen, setBrandOpen] = useState(false);
    const { data: companiesData } = useCompanies();
    // limit=200 so every brand for the selected company is pickable. The
    // default API limit is 10 — under that cap, brands past the 10th were
    // silently invisible in the picker.
    const { data: brandsData } = useBrands(
        state.companyId ? { company_id: state.companyId, limit: "200" } : undefined
    );
    const companies = companiesData?.data || [];
    const brands = brandsData?.data || [];
    const selectedBrand = brands.find((b) => b.id === state.brandId) || null;

    return (
        <div className="py-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Company *</Label>
                    <Select
                        value={state.companyId}
                        onValueChange={(v) => update({ companyId: v, brandId: "" })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                        <SelectContent>
                            {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Brand</Label>
                    <Popover open={brandOpen} onOpenChange={setBrandOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={brandOpen}
                                disabled={!state.companyId}
                                className="w-full justify-between font-normal"
                            >
                                <span
                                    className={cn(
                                        "truncate",
                                        !selectedBrand && "text-muted-foreground"
                                    )}
                                >
                                    {selectedBrand ? selectedBrand.name : "Select brand"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="p-0 w-[--radix-popover-trigger-width]"
                            align="start"
                        >
                            <Command>
                                <CommandInput placeholder="Search brand…" />
                                <CommandList>
                                    <CommandEmpty>No brand matches.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="__none__"
                                            onSelect={() => {
                                                update({ brandId: "" });
                                                setBrandOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    !state.brandId ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <span className="text-muted-foreground">No brand</span>
                                        </CommandItem>
                                        {brands.map((b) => (
                                            <CommandItem
                                                key={b.id}
                                                value={b.name}
                                                onSelect={() => {
                                                    update({ brandId: b.id });
                                                    setBrandOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        state.brandId === b.id
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {b.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                    value={state.itemName}
                    onChange={(e) => update({ itemName: e.target.value })}
                    placeholder="e.g. Pedestrian Fan, Metal Stand, Gasoline Canister"
                />
                {state.stockMode === "SERIALIZED" && (
                    <p className="text-xs text-muted-foreground">
                        The system will automatically name each unit: {state.itemName || "Item"} #1,
                        #2, etc.
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Category *</Label>
                <CategoryCombobox
                    companyId={state.companyId || null}
                    value={state.category_id}
                    newCategory={state.new_category}
                    onChange={(categoryId, newCategory) =>
                        update({
                            category_id: categoryId,
                            new_category: newCategory,
                        })
                    }
                />
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                    value={state.itemDescription}
                    onChange={(e) => update({ itemDescription: e.target.value })}
                    rows={2}
                    placeholder="Brief description of this item"
                />
            </div>

            {/* Handling tags */}
            <div className="space-y-2">
                <Label>Handling Tags</Label>
                <div className="flex flex-wrap gap-2">
                    {HANDLING_TAGS.map((tag) => {
                        const active = state.handlingTags.includes(tag);
                        return (
                            <Badge
                                key={tag}
                                variant={active ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() =>
                                    update({
                                        handlingTags: active
                                            ? state.handlingTags.filter((t) => t !== tag)
                                            : [...state.handlingTags, tag],
                                    })
                                }
                            >
                                {tag}
                            </Badge>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
