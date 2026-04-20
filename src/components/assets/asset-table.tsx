"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Package, QrCode, MapPin, MoreVertical, Eye, ArrowRightLeft } from "lucide-react";
import { useAssets } from "@/hooks/use-assets";
import { useAssetCategories } from "@/hooks/use-asset-categories";
import { useWarehouses } from "@/hooks/use-warehouses";
import { MoveToFamilyModal } from "@/components/assets/move-to-family-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Asset } from "@/types/asset";

const CONDITION_STYLES: Record<string, string> = {
    GREEN: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    ORANGE: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    RED: "bg-red-500/10 text-red-700 border-red-500/20",
};

const STATUS_STYLES: Record<string, string> = {
    AVAILABLE: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    BOOKED: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    OUT: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    MAINTENANCE: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    TRANSFORMED: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const ITEMS_PER_PAGE = 25;

export function AssetTable() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [moveAsset, setMoveAsset] = useState<Asset | null>(null);
    const [filters, setFilters] = useState({
        category: "all",
        condition: "all",
        status: "all",
        warehouse_id: "all",
        tracking_method: "all",
    });

    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters]);

    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            page: String(page),
            limit: String(ITEMS_PER_PAGE),
        };
        if (debouncedSearch) params.search_term = debouncedSearch;
        if (filters.category !== "all") params.category = filters.category;
        if (filters.condition !== "all") params.condition = filters.condition;
        if (filters.status !== "all") params.status = filters.status;
        if (filters.warehouse_id !== "all") params.warehouse_id = filters.warehouse_id;
        if (filters.tracking_method !== "all") params.tracking_method = filters.tracking_method;
        return params;
    }, [filters, debouncedSearch, page]);

    const { data, isLoading } = useAssets(queryParams);
    const assets = data?.data || [];
    const totalAssets = Number(data?.meta?.total || assets.length);
    const totalPages = Math.max(1, Math.ceil(totalAssets / ITEMS_PER_PAGE));

    const { data: categoriesData } = useAssetCategories();
    const categories = (categoriesData?.data || []).filter((c) => c.is_active);

    const { data: warehousesData } = useWarehouses();
    const warehouses = (warehousesData as any)?.data || [];

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 lg:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search assets..."
                        className="bg-background pl-10 font-mono"
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <Select
                        value={filters.category}
                        onValueChange={(value) => setFilters((c) => ({ ...c, category: value }))}
                    >
                        <SelectTrigger className="w-[150px] font-mono">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.slug || cat.id}>
                                    <span className="flex items-center gap-2">
                                        <span
                                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                                            style={{ backgroundColor: cat.color }}
                                        />
                                        {cat.name}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.condition}
                        onValueChange={(value) => setFilters((c) => ({ ...c, condition: value }))}
                    >
                        <SelectTrigger className="w-[140px] font-mono">
                            <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Conditions</SelectItem>
                            <SelectItem value="GREEN">Green</SelectItem>
                            <SelectItem value="ORANGE">Orange</SelectItem>
                            <SelectItem value="RED">Red</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.status}
                        onValueChange={(value) => setFilters((c) => ({ ...c, status: value }))}
                    >
                        <SelectTrigger className="w-[140px] font-mono">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="AVAILABLE">Available</SelectItem>
                            <SelectItem value="BOOKED">Booked</SelectItem>
                            <SelectItem value="OUT">Out</SelectItem>
                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                            <SelectItem value="TRANSFORMED">Transformed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.warehouse_id}
                        onValueChange={(value) =>
                            setFilters((c) => ({ ...c, warehouse_id: value }))
                        }
                    >
                        <SelectTrigger className="w-[150px] font-mono">
                            <SelectValue placeholder="Warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Warehouses</SelectItem>
                            {warehouses.map((w: any) => (
                                <SelectItem key={w.id} value={w.id}>
                                    {w.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={filters.tracking_method}
                        onValueChange={(value) =>
                            setFilters((c) => ({ ...c, tracking_method: value }))
                        }
                    >
                        <SelectTrigger className="w-[150px] font-mono">
                            <SelectValue placeholder="Tracking" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tracking</SelectItem>
                            <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                            <SelectItem value="BATCH">Batch</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-muted/50 p-4">
                        <Package className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 font-mono text-lg font-semibold">No assets found</h3>
                    <p className="max-w-md text-sm font-mono text-muted-foreground">
                        Adjust the filters or company selection to find assets.
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                    {/* Header row — lg+ only */}
                    <div className="hidden lg:grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto_auto_40px] items-center gap-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-mono font-semibold text-muted-foreground">
                        <div>Name</div>
                        <div>Family</div>
                        <div>Category</div>
                        <div>Location</div>
                        <div>Condition</div>
                        <div>Status</div>
                        <div>Tracking</div>
                        <div>Qty</div>
                        <div />
                    </div>

                    <div className="divide-y divide-border">
                        {assets.map((asset) => (
                            <div
                                key={asset.id}
                                className="px-3 py-2.5 transition-colors hover:bg-muted/30 lg:flex lg:items-center lg:gap-4 lg:px-4 lg:py-3"
                            >
                                {/* Mobile: stacked layout. Desktop: row items */}

                                {/* Top row on mobile — flex layout for name/thumb + right-side qty/menu */}
                                <div className="flex items-center gap-2.5 lg:contents">
                                    {/* Thumbnail */}
                                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted border border-border lg:h-10 lg:w-10">
                                        {asset.images?.[0]?.url ? (
                                            <Image
                                                src={asset.images[0].url}
                                                alt={asset.name}
                                                fill
                                                className="object-contain"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                <Package className="h-3.5 w-3.5 text-muted-foreground/40" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Name + secondary meta */}
                                    <div className="flex-1 min-w-0 lg:flex lg:items-center lg:gap-3 lg:flex-1">
                                        <div className="min-w-0 lg:flex-1">
                                            <Link
                                                href={`/assets/${asset.id}`}
                                                className="font-mono text-sm font-medium truncate block hover:text-primary hover:underline"
                                            >
                                                {asset.name}
                                            </Link>
                                            <p className="text-[11px] font-mono text-muted-foreground truncate lg:text-xs">
                                                {asset.family?.name
                                                    ? `${asset.family.name}`
                                                    : "No family"}
                                                {asset.company?.name
                                                    ? ` · ${asset.company.name}`
                                                    : ""}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Quantity — always visible, right-aligned */}
                                    <div className="text-right shrink-0 lg:hidden">
                                        <div className="text-xs font-mono font-semibold whitespace-nowrap">
                                            {asset.available_quantity}
                                            <span className="text-muted-foreground font-normal">
                                                /{asset.total_quantity}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions menu — always visible */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 shrink-0 lg:order-last"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                                <span className="sr-only">Actions</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => router.push(`/assets/${asset.id}`)}
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setMoveAsset(asset)}>
                                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                                Move to Another Family
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Badges row — mobile only, wraps as needed */}
                                <div className="flex flex-wrap items-center gap-1 mt-2 pl-11 lg:hidden">
                                    {asset.family?.category && (
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-[9px] py-0 px-1.5 h-4"
                                        >
                                            <span
                                                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full mr-1"
                                                style={{
                                                    backgroundColor: asset.family.category.color,
                                                }}
                                            />
                                            {asset.family.category.name}
                                        </Badge>
                                    )}
                                    {asset.condition && (
                                        <Badge
                                            variant="outline"
                                            className={`font-mono text-[9px] py-0 px-1.5 h-4 ${CONDITION_STYLES[asset.condition] || ""}`}
                                        >
                                            {asset.condition}
                                        </Badge>
                                    )}
                                    <Badge
                                        variant="outline"
                                        className={`font-mono text-[9px] py-0 px-1.5 h-4 ${STATUS_STYLES[asset.status || ""] || ""}`}
                                    >
                                        {asset.status?.replace(/_/g, " ")}
                                    </Badge>
                                    {asset.warehouse?.name && (
                                        <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
                                            <MapPin className="h-2.5 w-2.5" />
                                            <span className="truncate max-w-[140px]">
                                                {asset.warehouse.name}
                                                {asset.zone?.name ? ` / ${asset.zone.name}` : ""}
                                            </span>
                                        </span>
                                    )}
                                </div>

                                {/* Desktop-only columns */}
                                <div className="hidden lg:block flex-1 min-w-0">
                                    {asset.family ? (
                                        <Link
                                            href={`/assets/families/${asset.family.id}`}
                                            className="font-mono text-xs hover:text-primary hover:underline truncate block"
                                        >
                                            {asset.family.name}
                                        </Link>
                                    ) : (
                                        <span className="font-mono text-xs text-muted-foreground">
                                            No family
                                        </span>
                                    )}
                                </div>
                                <div className="hidden lg:block shrink-0">
                                    {asset.family?.category ? (
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-[10px] py-0"
                                        >
                                            <span
                                                className="inline-block h-2 w-2 shrink-0 rounded-full mr-1"
                                                style={{
                                                    backgroundColor: asset.family.category.color,
                                                }}
                                            />
                                            {asset.family.category.name}
                                        </Badge>
                                    ) : (
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {asset.category || "—"}
                                        </span>
                                    )}
                                </div>
                                <div className="hidden lg:flex items-center gap-1 text-xs font-mono text-muted-foreground shrink-0">
                                    <MapPin className="h-3 w-3" />
                                    <span className="max-w-[120px] truncate">
                                        {asset.warehouse?.name || "—"} / {asset.zone?.name || "—"}
                                    </span>
                                </div>
                                <div className="hidden lg:block shrink-0">
                                    <Badge
                                        variant="outline"
                                        className={`font-mono text-[10px] py-0 ${CONDITION_STYLES[asset.condition || ""] || ""}`}
                                    >
                                        {asset.condition}
                                    </Badge>
                                </div>
                                <div className="hidden lg:block shrink-0">
                                    <Badge
                                        variant="outline"
                                        className={`font-mono text-[10px] py-0 ${STATUS_STYLES[asset.status || ""] || ""}`}
                                    >
                                        {asset.status?.replace(/_/g, " ")}
                                    </Badge>
                                </div>
                                <div className="hidden lg:block shrink-0">
                                    <span className="font-mono text-xs text-muted-foreground">
                                        {asset.tracking_method === "INDIVIDUAL"
                                            ? "Individual"
                                            : "Batch"}
                                    </span>
                                </div>
                                <div className="hidden lg:block text-right shrink-0">
                                    <div className="text-sm font-mono font-semibold">
                                        {asset.available_quantity}
                                        <span className="text-muted-foreground font-normal">
                                            /{asset.total_quantity}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground font-mono">
                        Showing {assets.length} of {totalAssets}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-mono text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}

            {/* Move to family modal */}
            {moveAsset && (
                <MoveToFamilyModal
                    open={!!moveAsset}
                    onOpenChange={(open) => {
                        if (!open) setMoveAsset(null);
                    }}
                    asset={moveAsset}
                    currentFamilyName={moveAsset.family?.name}
                />
            )}
        </div>
    );
}
