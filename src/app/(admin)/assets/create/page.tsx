"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Loader2,
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
import { useCreateAsset, useUploadImage } from "@/hooks/use-assets";
import { useCompanies } from "@/hooks/use-companies";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useZones } from "@/hooks/use-zones";
import { useBrands } from "@/hooks/use-brands";
import { useTeams } from "@/hooks/use-teams";
import { useIsMobile } from "@/hooks/use-mobile";
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

export default function MobileCreateAssetPage() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const [isMounted, setIsMounted] = useState(false);
    const [currentStep, setCurrentStep] = useState<Step>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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

    const { data: companiesResponse } = useCompanies({ limit: "100" });
    const { data: warehousesResponse } = useWarehouses(
        formData.company_id ? { company_id: formData.company_id } : { limit: "100" }
    );
    const { data: zonesResponse } = useZones(
        formData.warehouse_id ? { warehouse_id: formData.warehouse_id } : undefined
    );
    const { data: brandsResponse } = useBrands(
        formData.company_id ? { company_id: formData.company_id } : undefined
    );
    const { data: teamsResponse } = useTeams(
        formData.company_id ? { company_id: formData.company_id } : undefined
    );

    const createAsset = useCreateAsset();
    const uploadImage = useUploadImage();

    const companies = companiesResponse?.data || [];
    const warehouses = warehousesResponse?.data || [];
    const zones = zonesResponse?.data || [];
    const brands = brandsResponse?.data || [];
    const teams = teamsResponse?.data || [];

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const progressPercent = useMemo(() => ((currentStep + 1) / STEPS.length) * 100, [currentStep]);

    const updateDimension = (field: "length" | "width" | "height", value: number) => {
        const nextDimensions = {
            ...formData.dimensions,
            [field]: value,
        };

        const length = nextDimensions.length || 0;
        const width = nextDimensions.width || 0;
        const height = nextDimensions.height || 0;

        const nextVolume =
            length > 0 && width > 0 && height > 0 ? (length * width * height) / 1000000 : 0;

        setFormData((prev) => ({
            ...prev,
            dimensions: nextDimensions,
            volume_per_unit: nextVolume,
        }));
    };

    const onSelectImages = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        setSelectedImages((prev) => [...prev, ...files]);
        const urls = files.map((file) => URL.createObjectURL(file));
        setPreviewUrls((prev) => [...prev, ...urls]);
    };

    const removeImageAt = (index: number) => {
        const fileList = [...selectedImages];
        const urlList = [...previewUrls];

        URL.revokeObjectURL(urlList[index]);
        fileList.splice(index, 1);
        urlList.splice(index, 1);

        setSelectedImages(fileList);
        setPreviewUrls(urlList);
    };

    const validateStep = (step: Step) => {
        if (step === 0) {
            if (!formData.company_id || !formData.name || !formData.category) {
                toast.error("Complete company, asset name, and category.");
                return false;
            }
            return true;
        }

        if (step === 1) {
            if (!formData.warehouse_id || !formData.zone_id) {
                toast.error("Select warehouse and zone.");
                return false;
            }

            if (formData.condition === "ORANGE" || formData.condition === "RED") {
                if (!formData.refurb_days_estimate || formData.refurb_days_estimate <= 0) {
                    toast.error("Refurbishment days are required for ORANGE/RED assets.");
                    return false;
                }
                if (!formData.condition_notes || formData.condition_notes.trim().length < 10) {
                    toast.error(
                        "Condition notes must be at least 10 characters for ORANGE/RED assets."
                    );
                    return false;
                }
            }

            return true;
        }

        if (step === 2) {
            const length = formData.dimensions?.length || 0;
            const width = formData.dimensions?.width || 0;
            const height = formData.dimensions?.height || 0;

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
        if (!validateStep(currentStep)) return;
        if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as Step);
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
            toast.error("Missing required relationships for asset creation.");
            return;
        }

        setIsSubmitting(true);
        try {
            let imageUrls: string[] = [];
            if (selectedImages.length > 0) {
                const uploadFormData = new FormData();
                uploadFormData.append("companyId", formData.company_id);
                selectedImages.forEach((file) => uploadFormData.append("files", file));
                const uploadResult = await uploadImage.mutateAsync(uploadFormData);
                imageUrls = uploadResult?.data?.imageUrls || [];
            }

            await createAsset.mutateAsync({
                company_id: formData.company_id,
                warehouse_id: formData.warehouse_id,
                zone_id: formData.zone_id,
                brand_id: formData.brand_id,
                name: formData.name || "",
                description: formData.description,
                category: formData.category,
                images: imageUrls.map((url) => ({ url })),
                tracking_method: formData.tracking_method || "INDIVIDUAL",
                total_quantity: formData.total_quantity || 1,
                available_quantity: formData.available_quantity || 1,
                packaging: formData.packaging,
                weight_per_unit: formData.weight_per_unit || 0,
                dimensions: formData.dimensions || {},
                volume_per_unit: formData.volume_per_unit || 0,
                condition: formData.condition || "GREEN",
                condition_notes: formData.condition_notes,
                refurb_days_estimate: formData.refurb_days_estimate,
                status: "AVAILABLE",
                handling_tags: formData.handling_tags || [],
            });

            toast.success("Asset created successfully");
            router.push("/assets");
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
                        <Button onClick={() => router.push("/assets")} className="w-full">
                            Back to Assets
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
                <div className="px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" onClick={() => router.push("/assets")}>
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Back
                        </Button>
                        <Badge variant="outline" className="font-mono text-xs">
                            Step {currentStep + 1} of {STEPS.length}
                        </Badge>
                    </div>
                    <div className="space-y-1">
                        <h1 className="font-mono text-lg font-bold uppercase">Create Asset</h1>
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
                                        {companies.map((company) => (
                                            <SelectItem key={company.id} value={company.id}>
                                                {company.name}
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
                                <Label>Brand</Label>
                                <Select
                                    value={formData.brand_id || "_none_"}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            brand_id: value === "_none_" ? undefined : value,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Optional brand" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none_">No Brand</SelectItem>
                                        {brands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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
                                        {DEFAULT_CATEGORIES.map((category) => (
                                            <SelectItem key={category} value={category}>
                                                {category}
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
                                    rows={4}
                                    placeholder="Optional details about this asset"
                                />
                            </div>

                            {teams.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Team (optional)</Label>
                                    <Select
                                        value={formData.team_id || "_none_"}
                                        onValueChange={(value) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                team_id: value === "_none_" ? null : value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="No team (shared)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="_none_">No team (shared)</SelectItem>
                                            {teams.map((team) => (
                                                <SelectItem key={team.id} value={team.id}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

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
                                        {warehouses.map((warehouse) => (
                                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                                {warehouse.name}
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
                                        {zones.map((zone) => (
                                            <SelectItem key={zone.id} value={zone.id}>
                                                {zone.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Condition</Label>
                                <Select
                                    value={formData.condition || "GREEN"}
                                    onValueChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            condition: value as "GREEN" | "ORANGE" | "RED",
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GREEN">GREEN</SelectItem>
                                        <SelectItem value="ORANGE">ORANGE</SelectItem>
                                        <SelectItem value="RED">RED</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(formData.condition === "ORANGE" || formData.condition === "RED") && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Refurbishment Days *</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            step="1"
                                            value={formData.refurb_days_estimate || ""}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    refurb_days_estimate: Math.max(
                                                        1,
                                                        Math.floor(toPositiveNumber(e.target.value))
                                                    ),
                                                }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Condition Notes *</Label>
                                        <Textarea
                                            rows={4}
                                            value={formData.condition_notes || ""}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    condition_notes: e.target.value,
                                                }))
                                            }
                                            placeholder="Describe damage/maintenance context (min 10 chars)"
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

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
                                <div className="space-y-2">
                                    <Label>L (cm) *</Label>
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={formData.dimensions?.length || ""}
                                        onChange={(e) =>
                                            updateDimension(
                                                "length",
                                                toPositiveNumber(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>W (cm) *</Label>
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={formData.dimensions?.width || ""}
                                        onChange={(e) =>
                                            updateDimension(
                                                "width",
                                                toPositiveNumber(e.target.value)
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>H (cm) *</Label>
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        value={formData.dimensions?.height || ""}
                                        onChange={(e) =>
                                            updateDimension(
                                                "height",
                                                toPositiveNumber(e.target.value)
                                            )
                                        }
                                    />
                                </div>
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
                                        value={formData.total_quantity || 1}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                total_quantity: Math.max(
                                                    1,
                                                    Math.floor(toPositiveNumber(e.target.value))
                                                ),
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
                                        value={formData.available_quantity || 1}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                available_quantity: Math.max(
                                                    0,
                                                    Math.floor(toPositiveNumber(e.target.value))
                                                ),
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

                {currentStep === 3 && (
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase">
                                    Photos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Label htmlFor="asset-images" className="sr-only">
                                    Upload images
                                </Label>
                                <input
                                    id="asset-images"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={onSelectImages}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => document.getElementById("asset-images")?.click()}
                                >
                                    <Camera className="w-4 h-4 mr-2" />
                                    Add Photos
                                </Button>

                                {previewUrls.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {previewUrls.map((url, index) => (
                                            <div
                                                key={`${url}-${index}`}
                                                className="relative aspect-square rounded-md overflow-hidden border"
                                            >
                                                <img
                                                    src={url}
                                                    alt="Asset preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center"
                                                    onClick={() => removeImageAt(index)}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="font-mono text-sm uppercase">
                                    Review
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-medium">{formData.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Category</span>
                                    <span className="font-medium">{formData.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tracking</span>
                                    <span className="font-medium">{formData.tracking_method}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Condition</span>
                                    <span className="font-medium">{formData.condition}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Photos</span>
                                    <span className="font-medium">{selectedImages.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Volume (m³)</span>
                                    <span className="font-medium">
                                        {formData.volume_per_unit || 0}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 inset-x-0 border-t border-border bg-background/95 backdrop-blur">
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
                                    Creating...
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
