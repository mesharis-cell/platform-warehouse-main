"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelfPickups } from "@/hooks/use-self-pickups";
import { usePlatform } from "@/contexts/platform-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, ChevronLeft, ChevronRight, User } from "lucide-react";

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
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const { data, isLoading } = useSelfPickups({
        page,
        limit: 20,
        self_pickup_status: status || undefined,
        search: search || undefined,
    });

    const pickups = data?.data?.self_pickups || [];
    const totalPages = data?.data?.total_pages || 1;

    if (platformLoading || !selfPickupEnabled) {
        return null;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Self Pickups</h1>
                <p className="text-muted-foreground">Manage pickup handovers and returns</p>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="pl-10"
                    />
                </div>
                <Select
                    value={status || "_all_"}
                    onValueChange={(v) => {
                        setStatus(v === "_all_" ? "" : v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="_all_">All statuses</SelectItem>
                        {Object.entries(PICKUP_STATUS_CONFIG).map(([k, c]) => (
                            <SelectItem key={k} value={k}>
                                {c.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Collector</TableHead>
                                <TableHead>Pickup Window</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 5 }).map((_, j) => (
                                            <TableCell key={j}>
                                                <Skeleton className="h-4 w-20" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : pickups.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        No self-pickups found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pickups.map((p: any) => {
                                    const sc = PICKUP_STATUS_CONFIG[p.self_pickup_status] || {
                                        label: p.self_pickup_status,
                                        color: "bg-gray-100 text-gray-700",
                                    };
                                    const pw = p.pickup_window as any;
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/self-pickups/${p.id}`}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    {p.self_pickup_id}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3 text-muted-foreground" />
                                                    {p.collector_name}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {pw?.start
                                                    ? new Date(pw.start).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={sc.color}>
                                                    {sc.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {p.self_pickup_status === "READY_FOR_PICKUP" && (
                                                    <Link
                                                        href={`/scanning/self-pickup-handover/${p.id}`}
                                                    >
                                                        <Button size="sm" variant="outline">
                                                            Handover Scan
                                                        </Button>
                                                    </Link>
                                                )}
                                                {p.self_pickup_status === "AWAITING_RETURN" && (
                                                    <Link
                                                        href={`/scanning/self-pickup-return/${p.id}`}
                                                    >
                                                        <Button size="sm" variant="outline">
                                                            Return Scan
                                                        </Button>
                                                    </Link>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
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
    );
}
