"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useToken } from "@/lib/auth/use-token";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ExportCardId = "workSummary" | "ordersExport" | "stockReport" | "inboundLog";

type ExportCardConfig = {
    id: ExportCardId;
    title: string;
    description: string;
    endpoint: string;
    filename: string;
};

const EXPORT_CARDS: ExportCardConfig[] = [
    {
        id: "workSummary",
        title: "Work Summary",
        description:
            "Buy-side cost breakdown per order — ops, logistics, transport, and line items. Use this to invoice the platform for work completed.",
        endpoint: "/operations/v1/export/work-summary",
        filename: "work-summary.csv",
    },
    {
        id: "ordersExport",
        title: "Orders Export",
        description: "Full order list with status, company, event dates, and pricing details.",
        endpoint: "/operations/v1/export/orders",
        filename: "orders.csv",
    },
    {
        id: "stockReport",
        title: "Stock Report",
        description: "Current inventory — all assets with quantity, condition, warehouse, and zone.",
        endpoint: "/operations/v1/export/stock-report",
        filename: "stock-report.csv",
    },
    {
        id: "inboundLog",
        title: "Inbound Log",
        description: "All new stock requests with status, company, requester, and pricing.",
        endpoint: "/operations/v1/export/inbound-log",
        filename: "inbound-log.csv",
    },
];

export default function WarehouseReportsPage() {
    const { user } = useToken();
    const [loading, setLoading] = useState<ExportCardId | null>(null);
    const [filters, setFilters] = useState({ dateFrom: "", dateTo: "" });

    const handleExport = async (card: ExportCardConfig) => {
        setLoading(card.id);
        try {
            const params: Record<string, string> = {};
            if (filters.dateFrom) params.date_from = filters.dateFrom;
            if (filters.dateTo) params.date_to = filters.dateTo;

            const response = await apiClient.get(card.endpoint, {
                params,
                responseType: "blob",
            });

            const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = card.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`${card.title} downloaded`);
        } catch (err) {
            throwApiError(err);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-mono font-bold uppercase tracking-tight">Reports & Exports</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Download operational data as CSV. Apply date filters to scope results.
                </p>
            </div>

            {/* Global Date Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-mono uppercase tracking-wide">Date Range Filter</CardTitle>
                    <CardDescription>Applied to all exports that support date filtering.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 flex-wrap">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-mono uppercase">From</Label>
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                                className="w-44 font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-mono uppercase">To</Label>
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                                className="w-44 font-mono text-sm"
                            />
                        </div>
                        {(filters.dateFrom || filters.dateTo) && (
                            <div className="flex items-end">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFilters({ dateFrom: "", dateTo: "" })}
                                    className="text-xs font-mono uppercase text-muted-foreground"
                                >
                                    Clear
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Export Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {EXPORT_CARDS.map((card) => (
                    <Card key={card.id} className="flex flex-col">
                        <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                                <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-mono uppercase tracking-wide">
                                        {card.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-0.5">
                                        {card.description}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0 mt-auto">
                            <Button
                                className="w-full font-mono text-xs uppercase tracking-wide"
                                variant={card.id === "workSummary" ? "default" : "outline"}
                                onClick={() => handleExport(card)}
                                disabled={loading === card.id}
                            >
                                <Download className="h-3.5 w-3.5 mr-2" />
                                {loading === card.id ? "Downloading..." : "Download CSV"}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <p className="text-[11px] text-muted-foreground font-mono">
                Logged in as {user?.name} ({user?.role})
            </p>
        </div>
    );
}
