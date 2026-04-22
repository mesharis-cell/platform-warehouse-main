"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelfPickups } from "@/hooks/use-self-pickups";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { usePlatform } from "@/contexts/platform-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    PackageCheck,
    Calendar,
    User,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";

// Warehouse subset — logistics acts on CONFIRMED and later. Earlier admin-only
// statuses (SUBMITTED, PRICING_REVIEW, etc.) are read-only here.
const PICKUP_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    READY_FOR_PICKUP: {
        label: "Ready for Pickup",
        color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    },
    PICKED_UP: { label: "Picked Up", color: "bg-teal-100 text-teal-700 border-teal-300" },
    AWAITING_RETURN: {
        label: "Awaiting Return",
        color: "bg-amber-100 text-amber-700 border-amber-300",
    },
    CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-700 border-gray-300" },
};

export default function WarehouseSelfPickupsPage() {
    const router = useRouter();
    const { platform, isLoading: platformLoading } = usePlatform();
    const selfPickupEnabled = (platform?.features as any)?.enable_self_pickup === true;

    useEffect(() => {
        if (!platformLoading && !selfPickupEnabled) {
            router.replace("/orders");
        }
    }, [platformLoading, selfPickupEnabled, router]);

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [company, setCompany] = useState("");
    const [brand, setBrand] = useState("");
    const [status, setStatus] = useState("");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const { data, isLoading } = useSelfPickups({
        page,
        limit: 20,
        company: company || undefined,
        brand: brand || undefined,
        self_pickup_status: status || undefined,
        search: search || undefined,
        sortBy,
        sortOrder,
    });
    const { data: companiesData } = useCompanies({ page: "1", limit: "100" });
    const { data: brandsData } = useBrands({ page: "1", limit: "100" });

    const pickups = data?.data?.self_pickups || [];
    const totalPages = data?.data?.total_pages || 1;
    const total = data?.data?.total ?? pickups.length;

    const activeFiltersCount =
        (company ? 1 : 0) + (brand ? 1 : 0) + (status ? 1 : 0) + (search ? 1 : 0);
    const clearFilters = () => {
        setCompany("");
        setBrand("");
        setStatus("");
        setSearch("");
        setSearchInput("");
        setPage(1);
    };
    const applySearch = () => {
        setSearch(searchInput);
        setPage(1);
    };

    if (platformLoading || !selfPickupEnabled) return null;

    return (
        <div className="min-h-screen bg-linear-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
            <AdminHeader
                icon={PackageCheck}
                title="SELF PICKUPS"
                description="Manage · Track · Fulfill"
                stats={{ label: "TOTAL PICKUPS", value: total }}
            />

            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters Sidebar */}
                    <Card className="lg:col-span-1 h-fit border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filters
                                </CardTitle>
                                {activeFiltersCount > 0 && (
                                    <Button
                                        onClick={clearFilters}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                    >
                                        Clear ({activeFiltersCount})
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Search
                                </label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="ID or collector..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && applySearch()}
                                        className="flex-1"
                                    />
                                    <Button onClick={applySearch} size="icon" variant="secondary">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Company
                                </label>
                                <Select
                                    value={company || "all"}
                                    onValueChange={(v) => {
                                        setCompany(v === "all" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Companies" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Companies</SelectItem>
                                        {companiesData?.data?.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Brand
                                </label>
                                <Select
                                    value={brand || "all"}
                                    onValueChange={(v) => {
                                        setBrand(v === "all" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Brands</SelectItem>
                                        {brandsData?.data?.map((b: any) => (
                                            <SelectItem key={b.id} value={b.id}>
                                                {b.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Status
                                </label>
                                <Select
                                    value={status || "all"}
                                    onValueChange={(v) => {
                                        setStatus(v === "all" ? "" : v);
                                        setPage(1);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        {Object.entries(PICKUP_STATUS_CONFIG).map(([k, c]) => (
                                            <SelectItem key={k} value={k}>
                                                {c.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-100">
                                <label className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                    Sort By
                                </label>
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="created_at">Created</SelectItem>
                                        <SelectItem value="updated_at">Updated</SelectItem>
                                        <SelectItem value="self_pickup_id">ID</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={sortOrder}
                                    onValueChange={(v) => setSortOrder(v as "asc" | "desc")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="desc">Newest first</SelectItem>
                                        <SelectItem value="asc">Oldest first</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main Content */}
                    <div className="lg:col-span-3 space-y-4">
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="p-8 space-y-4">
                                        {[...Array(5)].map((_, i) => (
                                            <Skeleton key={i} className="h-16 w-full" />
                                        ))}
                                    </div>
                                ) : pickups.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <PackageCheck className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                                        <p className="text-slate-600 font-medium">
                                            No self-pickups found
                                        </p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            Try adjusting your filters
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile cards */}
                                        <div className="lg:hidden p-4 space-y-3">
                                            {pickups.map((p: any) => {
                                                const sc = PICKUP_STATUS_CONFIG[
                                                    p.self_pickup_status
                                                ] || {
                                                    label: p.self_pickup_status,
                                                    color: "bg-gray-100 text-gray-700 border-gray-300",
                                                };
                                                const pw = p.pickup_window as any;
                                                return (
                                                    <Card
                                                        key={p.id}
                                                        className="border border-slate-200 shadow-sm"
                                                    >
                                                        <CardContent className="p-4 space-y-3">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <Link
                                                                    href={`/self-pickups/${p.id}`}
                                                                    className="font-mono text-xs font-semibold text-primary hover:underline"
                                                                >
                                                                    {p.self_pickup_id}
                                                                </Link>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`${sc.color} font-medium whitespace-nowrap`}
                                                                >
                                                                    {sc.label}
                                                                </Badge>
                                                            </div>
                                                            {p.company?.name && (
                                                                <p className="text-sm font-semibold text-slate-900">
                                                                    {p.company.name}
                                                                </p>
                                                            )}
                                                            <div className="flex items-start gap-2 text-sm">
                                                                <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                                                <span>{p.collector_name}</span>
                                                            </div>
                                                            {pw?.start && (
                                                                <div className="flex items-start gap-2 text-sm">
                                                                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                                                                    <span>
                                                                        {new Date(
                                                                            pw.start
                                                                        ).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex gap-2 pt-1">
                                                                <Link
                                                                    href={`/self-pickups/${p.id}`}
                                                                    className="flex-1"
                                                                >
                                                                    <Button
                                                                        variant="outline"
                                                                        className="w-full font-mono"
                                                                    >
                                                                        View
                                                                    </Button>
                                                                </Link>
                                                                {p.self_pickup_status ===
                                                                    "READY_FOR_PICKUP" && (
                                                                    <Link
                                                                        href={`/scanning/self-pickup-handover/${p.id}`}
                                                                        className="flex-1"
                                                                    >
                                                                        <Button className="w-full">
                                                                            Handover
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                                {p.self_pickup_status ===
                                                                    "AWAITING_RETURN" && (
                                                                    <Link
                                                                        href={`/scanning/self-pickup-return/${p.id}`}
                                                                        className="flex-1"
                                                                    >
                                                                        <Button className="w-full">
                                                                            Return
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>

                                        {/* Desktop table */}
                                        <div className="hidden lg:block">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-muted/50 border-border/50">
                                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                                            ID
                                                        </TableHead>
                                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                                            Company
                                                        </TableHead>
                                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                                            Collector
                                                        </TableHead>
                                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                                            Pickup Window
                                                        </TableHead>
                                                        <TableHead className="font-mono text-xs font-bold uppercase">
                                                            Status
                                                        </TableHead>
                                                        <TableHead className="font-mono text-xs font-bold uppercase text-right">
                                                            Actions
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {pickups.map((p: any) => {
                                                        const sc = PICKUP_STATUS_CONFIG[
                                                            p.self_pickup_status
                                                        ] || {
                                                            label: p.self_pickup_status,
                                                            color: "bg-gray-100 text-gray-700 border-gray-300",
                                                        };
                                                        const pw = p.pickup_window as any;
                                                        return (
                                                            <TableRow
                                                                key={p.id}
                                                                className="hover:bg-slate-50/50"
                                                            >
                                                                <TableCell>
                                                                    <Link
                                                                        href={`/self-pickups/${p.id}`}
                                                                        className="font-mono font-medium text-primary hover:underline"
                                                                    >
                                                                        {p.self_pickup_id}
                                                                    </Link>
                                                                </TableCell>
                                                                <TableCell className="text-sm">
                                                                    {p.company?.name || "—"}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className="flex items-center gap-1 text-sm">
                                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                                        {p.collector_name}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className="flex items-center gap-1 text-sm">
                                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                                        {pw?.start
                                                                            ? new Date(
                                                                                  pw.start
                                                                              ).toLocaleDateString()
                                                                            : "—"}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={sc.color}
                                                                    >
                                                                        {sc.label}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {p.self_pickup_status ===
                                                                    "READY_FOR_PICKUP" ? (
                                                                        <Link
                                                                            href={`/scanning/self-pickup-handover/${p.id}`}
                                                                        >
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                            >
                                                                                Handover Scan
                                                                            </Button>
                                                                        </Link>
                                                                    ) : p.self_pickup_status ===
                                                                      "AWAITING_RETURN" ? (
                                                                        <Link
                                                                            href={`/scanning/self-pickup-return/${p.id}`}
                                                                        >
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline"
                                                                            >
                                                                                Return Scan
                                                                            </Button>
                                                                        </Link>
                                                                    ) : null}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-600">
                                    Page {page} of {totalPages} · {total} total
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
