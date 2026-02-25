"use client";

import { useState, useMemo } from "react";
import {
    useBrands,
    useCreateBrand,
    useUpdateBrand,
    useDeleteRestoreBrand,
} from "@/hooks/use-brands";
import { useCompanies } from "@/hooks/use-companies";
import {
    Search,
    Tag,
    Building2,
    Image as ImageIcon,
    Plus,
    Pencil,
    MoreVertical,
    ToggleLeft,
    ToggleRight,
} from "lucide-react";
import { AdminHeader } from "@/components/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useToken } from "@/lib/auth/use-token";
import { hasPermission } from "@/lib/auth/permissions";
import { WAREHOUSE_ACTION_PERMISSIONS } from "@/lib/auth/permission-map";
import type { Brand } from "@/types";

const EMPTY_FORM = { company_id: "", name: "", description: "", logo_url: "" };

export default function BrandsPage() {
    const { user } = useToken();
    const canCreate = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.brandsCreate);
    const canUpdate = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.brandsUpdate);
    const canToggle = hasPermission(user, WAREHOUSE_ACTION_PERMISSIONS.brandsDelete);
    const canManage = canUpdate || canToggle;

    const [searchQuery, setSearchQuery] = useState("");
    const [companyFilter, setCompanyFilter] = useState("all");
    const [includeDeleted, setIncludeDeleted] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    const { data: companiesData } = useCompanies({ limit: "100" });
    const companies = companiesData?.data || [];

    const queryParams = useMemo(() => {
        const params: Record<string, string> = { limit: "100", offset: "0" };
        if (searchQuery) params.search_term = searchQuery;
        if (companyFilter !== "all") params.company_id = companyFilter;
        if (includeDeleted) params.include_inactive = "true";
        return params;
    }, [searchQuery, companyFilter, includeDeleted]);

    const { data, isLoading } = useBrands(queryParams);
    const brands = data?.data || [];
    const total = data?.meta?.total || 0;

    const createMutation = useCreateBrand();
    const updateMutation = useUpdateBrand();
    const toggleMutation = useDeleteRestoreBrand();

    const resetForm = () => setFormData(EMPTY_FORM);

    const openCreate = () => {
        setEditingBrand(null);
        resetForm();
        setIsDialogOpen(true);
    };

    const openEdit = (brand: Brand) => {
        setEditingBrand(brand);
        setFormData({
            company_id: brand.company?.id ?? "",
            name: brand.name,
            description: brand.description ?? "",
            logo_url: brand.logo_url ?? "",
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBrand) {
                await updateMutation.mutateAsync({
                    id: editingBrand.id,
                    data: {
                        name: formData.name,
                        description: formData.description || undefined,
                        logo_url: formData.logo_url || undefined,
                    },
                });
                toast.success("Brand updated");
            } else {
                await createMutation.mutateAsync({
                    company_id: formData.company_id,
                    name: formData.name,
                    description: formData.description || undefined,
                    logo_url: formData.logo_url || undefined,
                });
                toast.success("Brand created");
            }
            setIsDialogOpen(false);
            setEditingBrand(null);
            resetForm();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? err?.message ?? "Operation failed");
        }
    };

    const handleToggle = async (brand: Brand) => {
        try {
            await toggleMutation.mutateAsync(brand.id);
            toast.success(brand.is_active ? "Brand deactivated" : "Brand restored");
        } catch {
            toast.error("Failed to update brand status");
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Tag}
                title="BRAND REGISTRY"
                description="Client Brands · Categorization · Asset Tagging"
                stats={{ label: "REGISTERED BRANDS", value: total }}
                actions={
                    canCreate ? (
                        <Dialog
                            open={isDialogOpen}
                            onOpenChange={(open) => {
                                setIsDialogOpen(open);
                                if (!open) {
                                    setEditingBrand(null);
                                    resetForm();
                                }
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button className="gap-2 font-mono" onClick={openCreate}>
                                    <Plus className="h-4 w-4" />
                                    NEW BRAND
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="font-mono">
                                        {editingBrand ? "EDIT BRAND" : "CREATE NEW BRAND"}
                                    </DialogTitle>
                                    <DialogDescription className="font-mono text-xs">
                                        {editingBrand
                                            ? "Update brand details"
                                            : "Register a new client brand"}
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {!editingBrand && (
                                        <div className="space-y-2">
                                            <Label className="font-mono text-xs">COMPANY *</Label>
                                            <Select
                                                value={formData.company_id}
                                                onValueChange={(v) =>
                                                    setFormData((p) => ({ ...p, company_id: v }))
                                                }
                                                required
                                            >
                                                <SelectTrigger className="font-mono">
                                                    <SelectValue placeholder="Select company…" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {companies.map((c) => (
                                                        <SelectItem
                                                            key={c.id}
                                                            value={c.id}
                                                            className="font-mono"
                                                        >
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {editingBrand && (
                                        <div className="space-y-1">
                                            <Label className="font-mono text-xs">COMPANY</Label>
                                            <p className="text-sm font-mono px-3 py-2 rounded-md border border-input bg-muted text-muted-foreground">
                                                {editingBrand.company?.name}
                                            </p>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">BRAND NAME *</Label>
                                        <Input
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData((p) => ({ ...p, name: e.target.value }))
                                            }
                                            placeholder="e.g., Johnnie Walker"
                                            required
                                            className="font-mono"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">DESCRIPTION</Label>
                                        <Textarea
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData((p) => ({
                                                    ...p,
                                                    description: e.target.value,
                                                }))
                                            }
                                            placeholder="Optional brand description…"
                                            rows={3}
                                            className="font-mono resize-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-mono text-xs">LOGO URL</Label>
                                        <Input
                                            value={formData.logo_url}
                                            onChange={(e) =>
                                                setFormData((p) => ({
                                                    ...p,
                                                    logo_url: e.target.value,
                                                }))
                                            }
                                            placeholder="https://…"
                                            type="url"
                                            className="font-mono"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2 border-t">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsDialogOpen(false);
                                                setEditingBrand(null);
                                                resetForm();
                                            }}
                                            disabled={isPending}
                                            className="font-mono"
                                        >
                                            CANCEL
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                isPending || (!editingBrand && !formData.company_id)
                                            }
                                            className="font-mono"
                                        >
                                            {isPending
                                                ? "SAVING…"
                                                : editingBrand
                                                  ? "UPDATE"
                                                  : "CREATE"}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    ) : undefined
                }
            />

            {/* Controls */}
            <div className="border-b border-border bg-card px-8 py-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search brands…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 font-mono text-sm"
                        />
                    </div>

                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                        <SelectTrigger className="w-[220px] font-mono text-sm">
                            <SelectValue placeholder="All Companies" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all" className="font-mono">
                                All Companies
                            </SelectItem>
                            {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="font-mono">
                                    {c.name}
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
                        {includeDeleted ? "HIDE INACTIVE" : "SHOW INACTIVE"}
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="px-8 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <p className="text-sm font-mono text-muted-foreground animate-pulse">
                            LOADING BRANDS…
                        </p>
                    </div>
                ) : brands.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <Tag className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                        <p className="font-mono text-sm text-muted-foreground">NO BRANDS FOUND</p>
                        {canCreate && (
                            <Button
                                onClick={openCreate}
                                variant="outline"
                                className="font-mono text-xs"
                            >
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                CREATE FIRST BRAND
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="border border-border rounded-lg overflow-hidden bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 border-border/50">
                                    <TableHead className="font-mono text-xs font-bold">
                                        BRAND
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        COMPANY
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        DESCRIPTION
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        LOGO
                                    </TableHead>
                                    <TableHead className="font-mono text-xs font-bold">
                                        STATUS
                                    </TableHead>
                                    {canManage && <TableHead className="w-12" />}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {brands.map((brand, i) => {
                                    const logoUrl = brand.logo_url;
                                    return (
                                        <TableRow
                                            key={brand.id}
                                            className="group hover:bg-muted/30 transition-colors border-border/50"
                                            style={{ animationDelay: `${i * 40}ms` }}
                                        >
                                            <TableCell className="font-mono font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-md border-2 border-primary/20 flex items-center justify-center overflow-hidden bg-primary/5">
                                                        {logoUrl ? (
                                                            <img
                                                                src={logoUrl}
                                                                alt={brand.name}
                                                                className="h-full w-full object-contain"
                                                            />
                                                        ) : (
                                                            <Tag className="h-5 w-5 text-primary" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm">
                                                            {brand.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            ID: {brand.id.slice(0, 8)}…
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {brand.company?.name ?? "—"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground max-w-xs truncate">
                                                {brand.description || "—"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {logoUrl ? (
                                                    <a
                                                        href={logoUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <ImageIcon className="h-3 w-3" />
                                                        View
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={`font-mono text-xs ${brand.is_active ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}
                                                >
                                                    {brand.is_active ? "ACTIVE" : "INACTIVE"}
                                                </Badge>
                                            </TableCell>
                                            {canManage && (
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {canUpdate && (
                                                                <DropdownMenuItem
                                                                    onClick={() => openEdit(brand)}
                                                                    className="font-mono text-xs"
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                                                    Edit Brand
                                                                </DropdownMenuItem>
                                                            )}
                                                            {canToggle && (
                                                                <DropdownMenuItem
                                                                    onClick={() =>
                                                                        handleToggle(brand)
                                                                    }
                                                                    className={`font-mono text-xs ${brand.is_active ? "text-destructive" : "text-primary"}`}
                                                                    disabled={
                                                                        toggleMutation.isPending
                                                                    }
                                                                >
                                                                    {brand.is_active ? (
                                                                        <ToggleLeft className="h-3.5 w-3.5 mr-2" />
                                                                    ) : (
                                                                        <ToggleRight className="h-3.5 w-3.5 mr-2" />
                                                                    )}
                                                                    {brand.is_active
                                                                        ? "Deactivate"
                                                                        : "Restore"}
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
