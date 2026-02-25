"use client";

import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useCreateZone, useZones } from "@/hooks/use-zones";
import { hasPermission } from "@/lib/auth/permissions";
import { useToken } from "@/lib/auth/use-token";
import { WAREHOUSE_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import { Box, Building2, Filter, Grid3x3, Plus, Trash2, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function ZonesPage() {
    const { user } = useToken();
    const [warehouseFilter, setWarehouseFilter] = useState("all");
    const [companyFilter, setCompanyFilter] = useState("all");
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        warehouse_id: "",
        company_id: "",
        name: "",
        description: "",
        capacity: "",
    });
    const canCreateZone = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.zonesCreate);

    // Fetch reference data
    const { data: warehousesData } = useWarehouses({ limit: "100" });
    const { data: companiesData } = useCompanies({ limit: "100" });
    const warehouses = warehousesData?.data || [];
    const companies = companiesData?.data || [];

    // Build query params for zones
    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            limit: "100",
            page: "1",
        };
        if (warehouseFilter && warehouseFilter !== "all") params.warehouse_id = warehouseFilter;
        if (companyFilter && companyFilter !== "all") params.company_id = companyFilter;
        if (includeDeleted) params.include_inactive = "true";
        return params;
    }, [warehouseFilter, companyFilter, includeDeleted]);

    // Fetch zones
    const { data, isLoading: loading } = useZones(queryParams);
    const zones = data?.data || [];
    const total = data?.meta?.total || 0;
    const createMutation = useCreateZone();

    const resetForm = () =>
        setFormData({
            warehouse_id: "",
            company_id: "",
            name: "",
            description: "",
            capacity: "",
        });

    const handleCreateZone = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createMutation.mutateAsync({
                warehouse_id: formData.warehouse_id,
                company_id: formData.company_id,
                name: formData.name,
                description: formData.description || undefined,
                capacity: formData.capacity ? Number(formData.capacity) : undefined,
            } as any);
            toast.success("Zone created");
            setIsCreateOpen(false);
            resetForm();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create zone");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Grid3x3}
                title="ZONE MANAGEMENT"
                description="Storage Areas · Company Assignment · Organization"
                stats={{ label: "ALLOCATED ZONES", value: total }}
                actions={
                    canCreateZone ? (
                        <Dialog
                            open={isCreateOpen}
                            onOpenChange={(open) => {
                                setIsCreateOpen(open);
                                if (!open) resetForm();
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button className="gap-2 font-mono">
                                    <Plus className="h-4 w-4" />
                                    NEW ZONE
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="font-mono">CREATE NEW ZONE</DialogTitle>
                                    <DialogDescription className="font-mono text-xs">
                                        Allocate a company zone inside a warehouse
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateZone} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">WAREHOUSE *</Label>
                                            <Select
                                                value={formData.warehouse_id}
                                                onValueChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        warehouse_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="font-mono text-sm">
                                                    <SelectValue placeholder="Select warehouse" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {warehouses.map((wh) => (
                                                        <SelectItem
                                                            key={wh.id}
                                                            value={wh.id}
                                                            className="font-mono"
                                                        >
                                                            {wh.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">COMPANY *</Label>
                                            <Select
                                                value={formData.company_id}
                                                onValueChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        company_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="font-mono text-sm">
                                                    <SelectValue placeholder="Select company" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {companies.map((co) => (
                                                        <SelectItem
                                                            key={co.id}
                                                            value={co.id}
                                                            className="font-mono"
                                                        >
                                                            {co.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">ZONE NAME *</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    name: e.target.value,
                                                })
                                            }
                                            placeholder="e.g., Zone A - Premium Bar"
                                            className="font-mono"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">CAPACITY</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={formData.capacity}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        capacity: e.target.value,
                                                    })
                                                }
                                                className="font-mono"
                                                placeholder="e.g., 120"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">DESCRIPTION</Label>
                                            <Input
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        description: e.target.value,
                                                    })
                                                }
                                                className="font-mono"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsCreateOpen(false);
                                                resetForm();
                                            }}
                                            className="font-mono"
                                        >
                                            CANCEL
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="font-mono"
                                            disabled={createMutation.isPending}
                                        >
                                            {createMutation.isPending ? "CREATING..." : "CREATE"}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    ) : undefined
                }
            />

            {/* Control Panel */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        FILTERS:
                    </div>

                    <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                        <SelectTrigger className="w-[250px] font-mono text-sm">
                            <SelectValue placeholder="All Warehouses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-mono">
                                All Warehouses
                            </SelectItem>
                            {warehouses.map((wh) => (
                                <SelectItem key={wh.id} value={wh.id} className="font-mono">
                                    {wh.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                        <SelectTrigger className="w-[250px] font-mono text-sm">
                            <SelectValue placeholder="All Companies" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-mono">
                                All Companies
                            </SelectItem>
                            {companies.map((co) => (
                                <SelectItem key={co.id} value={co.id} className="font-mono">
                                    {co.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant={includeDeleted ? "default" : "outline"}
                        size="sm"
                        onClick={() => setIncludeDeleted(!includeDeleted)}
                        className="gap-2 font-mono text-xs"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        {includeDeleted ? "HIDE DELETED" : "SHOW DELETED"}
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="px-8 py-6">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm font-mono text-muted-foreground animate-pulse">
                            LOADING ZONES...
                        </div>
                    </div>
                ) : zones.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Box className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">NO ZONES FOUND</p>
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    <TableHead className="font-mono text-xs font-bold">
                                        ZONE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        WAREHOUSE
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        ASSIGNED COMPANY
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        CAPACITY
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        DESCRIPTION
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        STATUS
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {zones.map((zone, index) => (
                                    <TableRow
                                        key={zone.id}
                                        className="group hover:bg-muted/30 transition-colors border-border/50"
                                        style={{
                                            animationDelay: `${index * 50}ms`,
                                        }}
                                    >
                                        <TableCell className="font-mono font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                                    <Box className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-bold">{zone.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        ID: {zone.id.slice(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            <div className="flex items-center gap-2">
                                                <Warehouse className="h-3.5 w-3.5 text-secondary" />
                                                <span className="text-sm">
                                                    {zone.warehouse?.name || "-"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-sm font-medium">
                                                    {zone.company?.name || "-"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            <span className="text-sm font-medium">
                                                {zone.capacity || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono text-sm text-muted-foreground max-w-xs">
                                            {zone.description || "—"}
                                        </TableCell>
                                        <TableCell>
                                            {zone.is_active ? (
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-xs border-primary/30 text-primary"
                                                >
                                                    ACTIVE
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-xs border-destructive/30 text-destructive"
                                                >
                                                    DELETED
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="fixed bottom-4 right-4 font-mono text-xs text-muted-foreground/40">
                ZONE: ADMIN-ZONES · SEC-LEVEL: Platform-ADMIN
            </div>
        </div>
    );
}
