"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Check,
    Loader2,
    Plus,
    Search,
    X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateAsset } from "@/hooks/use-assets";
import { useAddCollectionItem } from "@/hooks/use-collections";
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import { useBrands, useCreateBrand } from "@/hooks/use-brands";
import { useTeams } from "@/hooks/use-teams";
import { useIsMobile } from "@/hooks/use-mobile";
import { PhotoCaptureStrip, PhotoEntry } from "@/components/shared/photo-capture-strip";
import {
    ConditionReportPanel,
    ConditionReport,
    validateConditionReport,
} from "@/components/shared/condition-report-panel";
import type { AssetCategory, CreateAssetRequest } from "@/types/asset";

type Step = 0 | 1 | 2 | 3;

const STEPS = [
    { id: 0, title: "Identity" },
    { id: 1, title: "Location & Condition" },
    { id: 2, title: "Specs & Tracking" },
    { id: 3, title: "Photos & Review" },
] as const;

const DEFAULT_CATEGORIES: AssetCategory[] = ["Furniture", "Glassware", "Installation", "Decor"];

const toPositiveNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
};

interface DraftState {
    formData: Partial<CreateAssetRequest>;
    conditionReport: ConditionReport;
    capturedPhotos: { previewUrl: string; note: string; uploadedUrl?: string }[];
    teamSelected: boolean;
}

const DEFAULT_CONDITION: ConditionReport = {
    condition: "GREEN",
    conditionPhotos: [],
    conditionNotes: "",
    refurbDays: null,
};

export default function MobileCreateAssetPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const isMobile = useIsMobile();
    const [isMounted, setIsMounted] = useState(false);
    const [currentStep, setCurrentStep] = useState<Step>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasDraft, setHasDraft] = useState(false);

    const [capturedPhotos, setCapturedPhotos] = useState<PhotoEntry[]>([]);
    const [conditionReport, setConditionReport] = useState<ConditionReport>(DEFAULT_CONDITION);
    const [teamSelected, setTeamSelected] = useState(false);

    const [formData, setFormData] = useState<Partial<CreateAssetRequest>>({
        tracking_method: "INDIVIDUAL",
        total_quantity: 1,
        available_quantity: 1,
        images: [],
        handling_tags: [],
        condition: "GREEN",
        status: "AVAILABLE",
        dimensions: {},
    });

    const collectionId = searchParams.get("collectionId");
    const returnTo = searchParams.get("returnTo");
    const flow = searchParams.get("flow");
    const isCollectionFlow = flow === "collection-builder" && Boolean(collectionId);
    const backTarget =
        returnTo ||
        (isCollectionFlow && collectionId ? `/collections/builder/${collectionId}` : "/assets");
    const draftKey = isCollectionFlow
        ? `warehouse.assetCreateDraft.collection.${collectionId}`
        : "warehouse.assetCreateDraft.standalone";

    const { data: companiesResponse } = useCompanies({ limit: "100" });
    const { data: warehousesResponse } = useWarehouses(
        formData.company_id ? { company_id: formData.company_id } : { limit: "100" }
    );
    const { data: zonesResponse } = useZones(
        formData.warehouse_id ? { warehouse_id: formData.warehouse_id } : undefined
    );
    const [brandOpen, setBrandOpen] = useState(false);
    const [brandSearch, setBrandSearch] = useState("");
    const [debouncedBrandSearch, setDebouncedBrandSearch] = useState("");
    const brandDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (brandDebounceRef.current) clearTimeout(brandDebounceRef.current);
        brandDebounceRef.current = setTimeout(() => setDebouncedBrandSearch(brandSearch), 300);
        return () => {
            if (brandDebounceRef.current) clearTimeout(brandDebounceRef.current);
        };
    }, [brandSearch]);

    const { data: brandsResponse, isFetching: brandsFetching } = useBrands(
        formData.company_id
            ? {
                  company_id: formData.company_id,
                  limit: "100",
                  ...(debouncedBrandSearch ? { search_term: debouncedBrandSearch } : {}),
              }
            : undefined
    );
    const { data: teamsResponse } = useTeams(
        formData.company_id ? { company_id: formData.company_id } : undefined
    );

    const createAsset = useCreateAsset();
    const addCollectionItem = useAddCollectionItem(collectionId || "");
    const createBrand = useCreateBrand();

    const [isNewBrandOpen, setIsNewBrandOpen] = useState(false);
    const [newBrandName, setNewBrandName] = useState("");
    const [isCreatingBrand, setIsCreatingBrand] = useState(false);

    const handleQuickCreateBrand = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.company_id || !newBrandName.trim()) return;
        setIsCreatingBrand(true);
        try {
            const created = await createBrand.mutateAsync({
                company_id: formData.company_id,
                name: newBrandName.trim(),
            });
            setFormData((prev) => ({ ...prev, brand_id: created.id }));
            setNewBrandName("");
            setIsNewBrandOpen(false);
            toast.success(`Brand "${created.name}" created`);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to create brand");
        } finally {
            setIsCreatingBrand(false);
        }
    };

    const companies = companiesResponse?.data || [];
    const warehouses = warehousesResponse?.data || [];
    const zones = zonesResponse?.data || [];
    const brands = brandsResponse?.data || [];
    const teams = teamsResponse?.data || [];

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Restore draft on mount
    useEffect(() => {
        if (!isMounted) return;
        try {
            const raw = localStorage.getItem(draftKey);
            if (!raw) return;
            const draft: DraftState = JSON.parse(raw);
            setFormData(draft.formData);
            setTeamSelected(draft.teamSelected ?? false);

            // Remap photo entries so previewUrl = uploadedUrl (blob URLs are gone after reload)
            const remapPhotos = (
                photos: { previewUrl: string; note: string; uploadedUrl?: string }[]
            ) =>
                (photos ?? []).map((p) => ({
                    previewUrl: p.uploadedUrl ?? p.previewUrl,
                    note: p.note,
                    uploadedUrl: p.uploadedUrl,
                }));

            const savedCondition = draft.conditionReport ?? DEFAULT_CONDITION;
            setConditionReport({
                ...savedCondition,
                conditionPhotos: remapPhotos(savedCondition.conditionPhotos),
            });
            setCapturedPhotos(remapPhotos(draft.capturedPhotos ?? []));
            setHasDraft(true);
        } catch (_) {
            /* ignore parse errors */
        }
    }, [isMounted, draftKey]);

    // Persist draft on every change
    useEffect(() => {
        if (!isMounted) return;
        try {
            const draft: DraftState = {
                formData,
                conditionReport,
                capturedPhotos: capturedPhotos.map((p) => ({
                    previewUrl: p.uploadedUrl ?? p.previewUrl,
                    note: p.note,
                    uploadedUrl: p.uploadedUrl,
                })),
                teamSelected,
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
        } catch (_) {
            /* ignore storage errors */
        }
    }, [isMounted, draftKey, formData, conditionReport, capturedPhotos, teamSelected]);

    const clearDraft = () => {
        localStorage.removeItem(draftKey);
        setHasDraft(false);
    };

    const progressPercent = useMemo(() => ((currentStep + 1) / STEPS.length) * 100, [currentStep]);

    const updateDimension = (field: "length" | "width" | "height", value: number) => {
        const nextDimensions = { ...formData.dimensions, [field]: value };
        const { length = 0, width = 0, height = 0 } = nextDimensions;
        const nextVolume =
            length > 0 && width > 0 && height > 0 ? (length * width * height) / 1000000 : 0;
        setFormData((prev) => ({
            ...prev,
            dimensions: nextDimensions,
            volume_per_unit: nextVolume,
        }));
    };

    const validateStep = (step: Step): boolean => {
        if (step === 0) {
            if (!formData.company_id || !formData.name || !formData.category) {
                toast.error("Complete company, asset name, and category.");
                return false;
            }
            if (teams.length > 0 && !teamSelected) {
                toast.error("Please select a team or 'No team (shared)'.");
                return false;
            }
            return true;
        }

        if (step === 1) {
            if (!formData.warehouse_id || !formData.zone_id) {
                toast.error("Select warehouse and zone.");
                return false;
            }
            const condErr = validateConditionReport(conditionReport);
            if (condErr) {
                toast.error(condErr);
                return false;
            }
            return true;
        }

        if (step === 2) {
            const { length = 0, width = 0, height = 0 } = formData.dimensions || {};
            if (
                !formData.weight_per_unit ||
                formData.weight_per_unit <= 0 ||
                length <= 0 ||
                width <= 0 ||
                height <= 0 ||
                !formData.volume_per_unit ||
                formData.volume_per_unit <= 0
            ) {
                toast.error("Weight, dimensions, and volume must all be positive.");
                return false;
            }
            if (!formData.total_quantity || formData.total_quantity < 1) {
                toast.error("Total quantity must be at least 1.");
                return false;
            }
            if ((formData.available_quantity || 0) > (formData.total_quantity || 0)) {
                toast.error("Available quantity cannot exceed total quantity.");
                return false;
            }
            if (formData.tracking_method === "BATCH" && !formData.packaging?.trim()) {
                toast.error("Packaging is required for BATCH tracking.");
                return false;
            }
            return true;
        }

        return true;
    };

    const goNext = () => {
        if (validateStep(currentStep) && currentStep < 3)
            setCurrentStep((prev) => (prev + 1) as Step);
    };
    const goBack = () => {
        if (currentStep > 0) setCurrentStep((prev) => (prev - 1) as Step);
    };

    const handleSubmit = async () => {
        if (!validateStep(0) || !validateStep(1) || !validateStep(2)) return;
        if (
            !formData.company_id ||
            !formData.warehouse_id ||
            !formData.zone_id ||
            !formData.category
        ) {
            toast.error("Missing required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Condition photos go separately → stored in assetConditionHistory.photos
            // General asset photos go into assets.images
            // Both sets were already uploaded to S3 as drafts; the server promotes them
            const conditionPhotos = conditionReport.conditionPhotos.map(
                (p) => p.uploadedUrl ?? p.previewUrl
            );
            const generalImages = capturedPhotos.map((p) => ({
                url: p.uploadedUrl ?? p.previewUrl,
                note: p.note || undefined,
            }));

            const createdAssetResult: any = await createAsset.mutateAsync({
                company_id: formData.company_id,
                warehouse_id: formData.warehouse_id,
                zone_id: formData.zone_id,
                brand_id: formData.brand_id,
                team_id: formData.team_id ?? null,
                name: formData.name || "",
                description: formData.description,
                category: formData.category,
                images: generalImages,
                condition_photos: conditionPhotos,
                tracking_method: formData.tracking_method || "INDIVIDUAL",
                total_quantity: formData.total_quantity || 1,
                available_quantity: formData.available_quantity || 1,
                packaging: formData.packaging,
                weight_per_unit: formData.weight_per_unit || 0,
                dimensions: formData.dimensions || {},
                volume_per_unit: formData.volume_per_unit || 0,
                condition: conditionReport.condition,
                condition_notes: conditionReport.conditionNotes || undefined,
                refurb_days_estimate: conditionReport.refurbDays ?? undefined,
                status: "AVAILABLE",
                handling_tags: formData.handling_tags || [],
            });

            const createdAssetId = createdAssetResult?.data?.id || createdAssetResult?.id;
            if (isCollectionFlow && collectionId && createdAssetId) {
                await addCollectionItem.mutateAsync({
                    asset_id: createdAssetId,
                    default_quantity: 1,
                });
            }

            clearDraft();
            toast.success("Asset created successfully");
            if (isCollectionFlow) {
                if (returnTo) {
                    router.push(returnTo);
                } else {
                    router.push(`/collections/builder/${collectionId}`);
                }
            } else {
                router.push("/assets");
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create asset");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isMounted && !isMobile) {
        return (
            <div className="min-h-screen bg-background p-4">
                <Card className="max-w-md mx-auto mt-12">
                    <CardHeader>
                        <CardTitle className="font-mono text-sm uppercase">
                            Mobile Only Flow
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Use the assets page on desktop. This create flow is optimized for
                            mobile.
                        </p>
                        <Button onClick={() => router.push(backTarget)} className="w-full">
                            {isCollectionFlow ? "Back to Builder" : "Back to Assets"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-40">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
                <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => router.push(backTarget)}>
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                        <Badge variant="outline" className="font-mono text-xs">
                            Step {currentStep + 1} of {STEPS.length}
                        </Badge>
                    </div>
                    <div className="space-y-1">
                        <h1 className="font-mono text-lg font-bold uppercase">
                            {isCollectionFlow ? "Create Collection Asset" : "Create Asset"}
                        </h1>
                        <p className="text-xs text-muted-foreground font-mono">
                            {STEPS[currentStep].title}
                        </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Draft restore banner */}
                {hasDraft && (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
                        <p className="text-xs text-primary font-mono">
                            Draft restored — continue where you left off
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                clearDraft();
                                setCurrentStep(0);
                                setFormData({
                                    tracking_method: "INDIVIDUAL",
                                    total_quantity: 1,
                                    available_quantity: 1,
                                    images: [],
                                    handling_tags: [],
                                    condition: "GREEN",
                                    status: "AVAILABLE",
                                    dimensions: {},
                                });
                                setConditionReport(DEFAULT_CONDITION);
                                setCapturedPhotos([]);
                                setTeamSelected(false);
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3 h-3" />
                            Clear
                        </button>
                    </div>
                )}

                {/* ── Step 0: Identity ── */}
                {currentStep === 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-mono text-sm uppercase">Identity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Company *</Label>
                                <Select
                                    value={formData.company_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            company_id: value,
                                            brand_id: undefined,
                                            warehouse_id: undefined,
                                            zone_id: undefined,
                                        }))
                                    }
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
                                <Label>Asset Name *</Label>
                                <Input
                                    value={formData.name || ""}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                    placeholder="Enter asset name"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Brand</Label>
                                    {formData.company_id && (
                                        <button
                                            type="button"
                                            onClick={() => setIsNewBrandOpen(true)}
                                            className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                                        >
                                            <Plus className="w-3 h-3" />
                                            New Brand
                                        </button>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!formData.company_id}
                                    onClick={() => formData.company_id && setBrandOpen((o) => !o)}
                                    className="w-full justify-between font-normal"
                                >
                                    <span className="truncate text-left">
                                        {formData.brand_id
                                            ? (brands.find((b) => b.id === formData.brand_id)
                                                  ?.name ?? "Select brand")
                                            : !formData.company_id
                                              ? "Select company first"
                                              : "No Brand"}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                {brandOpen && formData.company_id && (
                                    <div className="rounded-md border bg-popover shadow-sm">
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                            <input
                                                className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                                                placeholder="Search brands..."
                                                value={brandSearch}
                                                onChange={(e) => setBrandSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto p-1">
                                            {brandsFetching ? (
                                                <div className="py-4 text-center text-sm text-muted-foreground">
                                                    Loading...
                                                </div>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                brand_id: undefined,
                                                            }));
                                                            setBrandOpen(false);
                                                            setBrandSearch("");
                                                            setDebouncedBrandSearch("");
                                                        }}
                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                    >
                                                        <Check
                                                            className={`h-4 w-4 ${!formData.brand_id ? "opacity-100" : "opacity-0"}`}
                                                        />
                                                        No Brand
                                                    </button>
                                                    {brands.length === 0 ? (
                                                        <div className="py-2 text-center text-sm text-muted-foreground">
                                                            No brands found
                                                        </div>
                                                    ) : (
                                                        brands.map((b) => (
                                                            <button
                                                                key={b.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        brand_id: b.id,
                                                                    }));
                                                                    setBrandOpen(false);
                                                                    setBrandSearch("");
                                                                    setDebouncedBrandSearch("");
                                                                }}
                                                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                            >
                                                                <Check
                                                                    className={`h-4 w-4 ${formData.brand_id === b.id ? "opacity-100" : "opacity-0"}`}
                                                                />
                                                                {b.name}
                                                            </button>
                                                        ))
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick-create brand dialog */}
                            <Dialog open={isNewBrandOpen} onOpenChange={setIsNewBrandOpen}>
                                <DialogContent className="max-w-sm">
                                    <DialogHeader>
                                        <DialogTitle className="font-mono text-sm uppercase">
                                            New Brand
                                        </DialogTitle>
                                    </DialogHeader>
                                    <form onSubmit={handleQuickCreateBrand} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Brand Name *</Label>
                                            <Input
                                                value={newBrandName}
                                                onChange={(e) => setNewBrandName(e.target.value)}
                                                placeholder="e.g., Johnnie Walker"
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Creates under the selected company. You can add a logo
                                            later from the Brands page.
                                        </p>
                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => {
                                                    setIsNewBrandOpen(false);
                                                    setNewBrandName("");
                                                }}
                                                disabled={isCreatingBrand}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="flex-1"
                                                disabled={isCreatingBrand || !newBrandName.trim()}
                                            >
                                                {isCreatingBrand ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    "Create"
                                                )}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            category: value as AssetCategory,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DEFAULT_CATEGORIES.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={formData.description || ""}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
                                    }
                                    rows={3}
                                    placeholder="Optional details about this asset"
                                />
                            </div>

                            {/* Team — always shown when teams exist, explicit selection required */}
                            {teams.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Team *</Label>
                                    <Select
                                        value={teamSelected ? formData.team_id || "_none_" : ""}
                                        onValueChange={(value) => {
                                            setTeamSelected(true);
                                            setFormData((prev) => ({
                                                ...prev,
                                                team_id: value === "_none_" ? null : value,
                                            }));
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a team…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none_">No team (shared)</SelectItem>
                                            {teams.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Step 1: Location & Condition ── */}
                {currentStep === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-mono text-sm uppercase">
                                Location & Condition
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Warehouse *</Label>
                                <Select
                                    value={formData.warehouse_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            warehouse_id: value,
                                            zone_id: undefined,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Zone *</Label>
                                <Select
                                    value={formData.zone_id}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({ ...prev, zone_id: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select zone" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {zones.map((z) => (
                                            <SelectItem key={z.id} value={z.id}>
                                                {z.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Condition</Label>
                                <ConditionReportPanel
                                    value={conditionReport}
                                    onChange={setConditionReport}
                                    uploadOnCapture
                                    companyId={formData.company_id}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── Step 2: Specs & Tracking ── */}
                {currentStep === 2 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-mono text-sm uppercase">
                                Specs & Tracking
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Weight (kg) *</Label>
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={formData.weight_per_unit || ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                weight_per_unit: toPositiveNumber(e.target.value),
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tracking *</Label>
                                    <Select
                                        value={formData.tracking_method || "INDIVIDUAL"}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                tracking_method: value as "INDIVIDUAL" | "BATCH",
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INDIVIDUAL">INDIVIDUAL</SelectItem>
                                            <SelectItem value="BATCH">BATCH</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {(["length", "width", "height"] as const).map((dim, i) => (
                                    <div key={dim} className="space-y-2">
                                        <Label>{["L (cm)", "W (cm)", "H (cm)"][i]} *</Label>
                                        <Input
                                            type="number"
                                            min={0.01}
                                            step="0.01"
                                            value={formData.dimensions?.[dim] || ""}
                                            onChange={(e) =>
                                                updateDimension(
                                                    dim,
                                                    toPositiveNumber(e.target.value)
                                                )
                                            }
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>Volume (m³)</Label>
                                <Input value={formData.volume_per_unit || 0} disabled />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Total Qty *</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        step="1"
                                        value={formData.total_quantity ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                total_quantity:
                                                    e.target.value === ""
                                                        ? undefined
                                                        : Math.floor(
                                                              toPositiveNumber(e.target.value)
                                                          ),
                                            }))
                                        }
                                        onBlur={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                total_quantity:
                                                    !prev.total_quantity || prev.total_quantity < 1
                                                        ? 1
                                                        : prev.total_quantity,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Available Qty *</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="1"
                                        value={formData.available_quantity ?? ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                available_quantity:
                                                    e.target.value === ""
                                                        ? undefined
                                                        : Math.floor(
                                                              toPositiveNumber(e.target.value)
                                                          ),
                                            }))
                                        }
                                        onBlur={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                available_quantity:
                                                    prev.available_quantity == null
                                                        ? 1
                                                        : prev.available_quantity,
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            {formData.tracking_method === "BATCH" && (
                                <div className="space-y-2">
                                    <Label>Packaging *</Label>
                                    <Input
                                        value={formData.packaging || ""}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                packaging: e.target.value,
                                            }))
                                        }
                                        placeholder="e.g. Crate of 10 units"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Step 3: Photos & Review ── */}
                {currentStep === 3 && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase">
                                    Photos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <PhotoCaptureStrip
                                    photos={capturedPhotos}
                                    onChange={setCapturedPhotos}
                                    label="Asset Photos"
                                    uploadOnCapture
                                    companyId={formData.company_id}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase">
                                    Review
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                {[
                                    ["Name", formData.name],
                                    ["Category", formData.category],
                                    ["Tracking", formData.tracking_method],
                                    ["Condition", conditionReport.condition],
                                    [
                                        "Condition Photos",
                                        conditionReport.conditionPhotos.length || "—",
                                    ],
                                    ["Asset Photos", capturedPhotos.length || "—"],
                                    ["Volume (m³)", formData.volume_per_unit || 0],
                                ].map(([label, value]) => (
                                    <div key={label as string} className="flex justify-between">
                                        <span className="text-muted-foreground">{label}</span>
                                        <span className="font-medium">{value as string}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* ── Nav bar ── */}
            <div className="fixed bottom-16 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur lg:hidden">
                <div className="p-4 flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={goBack}
                        disabled={currentStep === 0 || isSubmitting}
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>
                    {currentStep < 3 ? (
                        <Button type="button" className="flex-1" onClick={goNext}>
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            className="flex-1"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating…
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Create Asset
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
