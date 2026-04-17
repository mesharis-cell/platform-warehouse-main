"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FolderPlus, Grid3x3, Layers3, List, Plus, Search, Upload } from "lucide-react";
import { useAssetFamilies } from "@/hooks/use-asset-families";
import { useAssetCategories } from "@/hooks/use-asset-categories";
import { AssetWizard } from "@/components/assets/asset-wizard";
import { AdminHeader } from "@/components/admin-header";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { WAREHOUSE_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { usePlatform } from "@/contexts/platform-context";
import { useIsMobile } from "@/hooks/use-mobile";
import type { AssetFamily } from "@/types/asset-family";

const formatStockMode = (stockMode?: string | null) =>
    stockMode ? stockMode.replace(/_/g, " ") : "Unknown";

const formatCount = (value?: number) => (typeof value === "number" ? value : 0);

function FamilyCard({ family, compact = false }: { family: AssetFamily; compact?: boolean }) {
    const redCount = formatCount(family.condition_summary?.red);
    const orangeCount = formatCount(family.condition_summary?.orange);
    const stockRecordCount = formatCount(family.stock_record_count ?? family.asset_count);
    const totalQuantity = formatCount(family.total_quantity);
    const availableQuantity = formatCount(family.available_quantity);
    const imageUrl = family.on_display_image || family.images[0]?.url || null;

    return (
        <Link href={`/assets/families/${family.id}`}>
            <Card className="group h-full overflow-hidden transition-colors hover:border-primary/50">
                <div className={`relative bg-muted ${compact ? "aspect-[3/2]" : "aspect-[4/3]"}`}>
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            alt={family.name}
                            fill
                            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                            <Layers3 className="h-10 w-10 opacity-40" />
                        </div>
                    )}
                    <div className="absolute left-3 top-3 flex gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                            {formatStockMode(family.stock_mode)}
                        </Badge>
                        {(redCount > 0 || orangeCount > 0) && (
                            <Badge variant="destructive" className="font-mono text-[10px]">
                                {redCount} red / {orangeCount} orange
                            </Badge>
                        )}
                    </div>
                </div>
                <CardContent className="space-y-3 p-4">
                    <div>
                        <h3 className="line-clamp-1 font-mono text-sm font-semibold transition-colors group-hover:text-primary">
                            {family.name}
                        </h3>
                        <p className="mt-1 text-xs font-mono text-muted-foreground">
                            {family.company?.name || "Unknown company"} • {family.category?.name || "Uncategorized"}
                        </p>
                        {family.brand?.name && (
                            <p className="mt-1 text-xs font-mono text-muted-foreground">
                                Brand: {family.brand.name}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono pt-1">
                        <div>
                            <span className="text-muted-foreground">
                                {family.stock_mode === "SERIALIZED" ? "Units " : "Total "}
                            </span>
                            <span className="font-semibold">{totalQuantity}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Available </span>
                            <span className="font-semibold text-emerald-600">
                                {availableQuantity}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function AssetsPage() {
    const { user } = useToken();
    const { platform } = usePlatform();
    const router = useRouter();
    const isMobile = useIsMobile();
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [showWizard, setShowWizard] = useState(false);
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 24;
    const [showMobileCreateActions, setShowMobileCreateActions] = useState(false);
    const [lastActiveBuilderId, setLastActiveBuilderId] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        category_id: "all",
        stockMode: "all",
    });

    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    useEffect(() => {
        debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    const canCreateAsset = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.assetsCreate);
    const canCreateCollection = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.collectionsCreate);
    const canBulkUploadAsset = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.assetsBulkUpload);
    const bulkUploadEnabled = platform?.features?.enable_asset_bulk_upload === true;

    useEffect(() => {
        try {
            const raw = localStorage.getItem("warehouse.collectionBuilder.lastActive");
            if (!raw) {
                setLastActiveBuilderId(null);
                return;
            }
            const parsed = JSON.parse(raw) as { collectionId?: string };
            setLastActiveBuilderId(parsed.collectionId || null);
        } catch {
            localStorage.removeItem("warehouse.collectionBuilder.lastActive");
            setLastActiveBuilderId(null);
        }
    }, []);

    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            page: String(page),
            limit: String(ITEMS_PER_PAGE),
        };
        if (debouncedSearch) params.search_term = debouncedSearch;
        if (filters.category_id !== "all") params.category_id = filters.category_id;
        if (filters.stockMode !== "all") params.stock_mode = filters.stockMode;
        return params;
    }, [filters, debouncedSearch, page]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filters]);

    const { data, isLoading } = useAssetFamilies(queryParams);
    const families = data?.data || [];
    const totalFamilies = Number((data as any)?.meta?.total || families.length);
    const totalPages = Math.max(1, Math.ceil(totalFamilies / ITEMS_PER_PAGE));
    const { data: categoriesData } = useAssetCategories();
    const categories = (categoriesData?.data || []).filter((c) => c.is_active);

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Layers3}
                title="ASSET FAMILIES"
                description="Catalog Identity · Stock Overview · Physical Records"
                stats={{ label: "TOTAL FAMILIES", value: totalFamilies }}
                actions={
                    canCreateAsset || (canBulkUploadAsset && bulkUploadEnabled) ? (
                        <div className="flex gap-2">
                            {canBulkUploadAsset && bulkUploadEnabled && !isMobile && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="font-mono"
                                    onClick={() => router.push("/assets/bulk-upload")}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Bulk Upload
                                </Button>
                            )}
                            {canCreateAsset && !isMobile && (
                                <Button onClick={() => setShowWizard(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Asset
                                </Button>
                            )}
                        </div>
                    ) : undefined
                }
            />

            <div className="mx-auto max-w-[1600px] px-6 py-8">
                <div className="mb-6 space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search asset families..."
                                className="bg-background pl-10 font-mono"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Select
                                value={filters.category_id}
                                onValueChange={(value) =>
                                    setFilters((current) => ({ ...current, category_id: value }))
                                }
                            >
                                <SelectTrigger className="w-[160px] font-mono">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            <span className="flex items-center gap-2">
                                                <span
                                                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                                                    style={{ backgroundColor: category.color }}
                                                />
                                                {category.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={filters.stockMode}
                                onValueChange={(value) =>
                                    setFilters((current) => ({ ...current, stockMode: value }))
                                }
                            >
                                <SelectTrigger className="w-[160px] font-mono">
                                    <SelectValue placeholder="Stock Mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stock Modes</SelectItem>
                                    <SelectItem value="SERIALIZED">Serialized</SelectItem>
                                    <SelectItem value="POOLED">Pooled</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex overflow-hidden rounded-lg border border-border">
                                <Button
                                    variant={viewMode === "grid" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("grid")}
                                    className="rounded-none border-r border-border"
                                >
                                    <Grid3x3 className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={viewMode === "list" ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setViewMode("list")}
                                    className="rounded-none"
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div
                        className={
                            viewMode === "grid"
                                ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                                : "space-y-4"
                        }
                    >
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Card key={index} className="overflow-hidden">
                                <Skeleton className="h-48 w-full" />
                                <CardContent className="space-y-3 p-4">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-2/3" />
                                    <Skeleton className="h-16 w-full" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : families.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 rounded-full bg-muted/50 p-4">
                            <Layers3 className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 font-mono text-lg font-semibold">
                            No asset families found
                        </h3>
                        <p className="mb-6 max-w-md text-sm font-mono text-muted-foreground">
                            Family-first browsing only shows grouped catalog identity. Adjust the
                            company/category filters or continue creating stock from the existing
                            asset workflows.
                        </p>
                        {canCreateAsset && !isMobile ? (
                            <Button onClick={() => setShowWizard(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Asset
                            </Button>
                        ) : null}
                    </div>
                ) : viewMode === "grid" ? (
                    <div
                        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                        data-testid="family-list"
                    >
                        {families.map((family) => (
                            <FamilyCard key={family.id} family={family} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4" data-testid="family-list">
                        {families.map((family) => (
                            <FamilyCard key={family.id} family={family} compact />
                        ))}
                    </div>
                )}
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6">
                        <p className="text-sm text-muted-foreground font-mono">
                            Showing {families.length} of {totalFamilies}
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
            </div>

            <AssetWizard open={showWizard} onOpenChange={setShowWizard} />

            {isMobile && (canCreateAsset || canCreateCollection) && (
                <>
                    {showMobileCreateActions && (
                        <button
                            type="button"
                            aria-label="Close create actions"
                            className="fixed inset-0 z-30 bg-transparent"
                            onClick={() => setShowMobileCreateActions(false)}
                        />
                    )}

                    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
                        {showMobileCreateActions && canCreateCollection && lastActiveBuilderId && (
                            <Button
                                onClick={() => {
                                    setShowMobileCreateActions(false);
                                    router.push(`/collections/builder/${lastActiveBuilderId}`);
                                }}
                                className="h-12 rounded-full border border-primary/30 px-4 font-mono shadow-lg"
                            >
                                <Grid3x3 className="mr-2 h-4 w-4" />
                                Resume Collection Builder
                            </Button>
                        )}

                        {showMobileCreateActions && canCreateCollection && (
                            <Button
                                onClick={() => {
                                    setShowMobileCreateActions(false);
                                    router.push("/collections/create");
                                }}
                                className="h-12 rounded-full border border-primary/30 px-4 font-mono shadow-lg"
                            >
                                <FolderPlus className="mr-2 h-4 w-4" />
                                Create Collection
                            </Button>
                        )}

                        {canCreateAsset ? (
                            <Button
                                onClick={() => {
                                    if (!showMobileCreateActions && canCreateCollection) {
                                        setShowMobileCreateActions(true);
                                        return;
                                    }
                                    setShowMobileCreateActions(false);
                                    setShowWizard(true);
                                }}
                                className={`border border-primary/30 font-mono shadow-lg ${
                                    showMobileCreateActions
                                        ? "h-12 rounded-full px-4"
                                        : "h-14 w-14 rounded-full"
                                }`}
                            >
                                <Plus
                                    className={`h-6 w-6 ${showMobileCreateActions ? "mr-2 h-4 w-4" : ""}`}
                                />
                                {showMobileCreateActions && <span>Create Asset</span>}
                            </Button>
                        ) : canCreateCollection ? (
                            <Button
                                onClick={() => router.push("/collections/create")}
                                className="h-14 w-14 rounded-full border border-primary/30 shadow-lg"
                            >
                                <FolderPlus className="h-6 w-6" />
                            </Button>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    );
}
