"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { useTeams } from "@/hooks/use-teams";
import { useCreateCollection, useUploadCollectionImages } from "@/hooks/use-collections";
import { toast } from "sonner";

const DRAFT_KEY = "warehouse.collectionCreateDraft";

interface CollectionCreateDraft {
    name: string;
    companyId: string;
    brandId: string;
    teamId: string | null;
    teamSelected: boolean;
    imagePreview?: string;
}

export default function CollectionCreatePage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [brandId, setBrandId] = useState("");
    const [teamId, setTeamId] = useState<string | null>(null);
    const [teamSelected, setTeamSelected] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const { data: companiesResponse } = useCompanies({ limit: "100" });
    const { data: brandsResponse } = useBrands(companyId ? { company_id: companyId } : undefined);
    const { data: teamsResponse } = useTeams(companyId ? { company_id: companyId } : undefined);
    const companies = companiesResponse?.data || [];
    const brands = brandsResponse?.data || [];
    const teams = teamsResponse?.data || [];

    const createCollection = useCreateCollection();
    const uploadCollectionImages = useUploadCollectionImages();

    useEffect(() => {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
            try {
                const draft = JSON.parse(raw) as CollectionCreateDraft;
                setName(draft.name || "");
                setCompanyId(draft.companyId || "");
                setBrandId(draft.brandId || "");
                setTeamId(draft.teamId ?? null);
                setTeamSelected(Boolean(draft.teamSelected));
                if (draft.imagePreview) setImagePreview(draft.imagePreview);
            } catch {
                // ignore broken draft
            }
        }
    }, []);

    useEffect(() => {
        const draft: CollectionCreateDraft = {
            name,
            companyId,
            brandId,
            teamId,
            teamSelected,
            imagePreview: imagePreview || undefined,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [name, companyId, brandId, teamId, teamSelected, imagePreview]);

    const companyName = useMemo(
        () => companies.find((company) => company.id === companyId)?.name || "",
        [companies, companyId]
    );

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        event.target.value = "";
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (!name.trim()) {
            toast.error("Collection name is required");
            return;
        }
        if (!companyId) {
            toast.error("Company is required");
            return;
        }
        if (!brandId) {
            toast.error("Brand is required");
            return;
        }
        if (!teamSelected) {
            toast.error("Please select a team or 'No team (shared)'");
            return;
        }

        try {
            let imageUrls: string[] = [];
            if (imageFile) {
                const uploadResponse = await uploadCollectionImages.mutateAsync([imageFile]);
                imageUrls = uploadResponse?.data?.imageUrls || [];
            }

            const created = await createCollection.mutateAsync({
                company_id: companyId,
                brand_id: brandId,
                team_id: teamId,
                name: name.trim(),
                images: imageUrls,
            });

            const collectionId = created?.data?.id || created?.id;
            if (!collectionId) {
                throw new Error("Collection created but ID was not returned");
            }

            localStorage.setItem(
                `warehouse.collectionBuilderDraft.${collectionId}`,
                JSON.stringify({ createdAt: Date.now(), companyName })
            );
            clearDraft();
            toast.success("Collection created. Add assets to complete the set.");
            router.push(`/collections/builder/${collectionId}`);
        } catch (error: any) {
            toast.error(error?.message || "Failed to create collection");
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="max-w-2xl mx-auto space-y-4">
                <Button
                    variant="ghost"
                    className="gap-2"
                    onClick={() => router.push("/collections")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Collections
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-mono text-lg uppercase flex items-center gap-2">
                            <FolderPlus className="h-5 w-5" />
                            Create Collection
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Set collection identity (company, brand, team/shared) first, then add
                            assets in the builder grid with those values locked.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase">
                                    Collection Name *
                                </Label>
                                <Input
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="e.g., Summer Event Set"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase">Company *</Label>
                                <Select
                                    value={companyId}
                                    onValueChange={(value) => {
                                        setCompanyId(value);
                                        setBrandId("");
                                        setTeamId(null);
                                        setTeamSelected(false);
                                    }}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue
                                            placeholder={
                                                companies.length > 0
                                                    ? "Select company"
                                                    : "Loading companies..."
                                            }
                                        />
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
                                <Label className="text-xs font-mono uppercase">Brand *</Label>
                                <Select
                                    value={brandId || "__empty__"}
                                    onValueChange={(value) =>
                                        setBrandId(value === "__empty__" ? "" : value)
                                    }
                                    disabled={!companyId}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue
                                            placeholder={
                                                companyId ? "Select brand" : "Select company first"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__empty__" disabled>
                                            Select brand
                                        </SelectItem>
                                        {brands.map((brand) => (
                                            <SelectItem key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase">Team *</Label>
                                <Select
                                    value={teamSelected ? (teamId ?? "_none_") : "__unselected__"}
                                    onValueChange={(value) => {
                                        if (value === "__unselected__") return;
                                        setTeamSelected(true);
                                        setTeamId(value === "_none_" ? null : value);
                                    }}
                                    disabled={!companyId}
                                >
                                    <SelectTrigger className="h-11">
                                        <SelectValue
                                            placeholder={
                                                companyId
                                                    ? "Select team or shared"
                                                    : "Select company first"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__unselected__" disabled>
                                            Select team
                                        </SelectItem>
                                        <SelectItem value="_none_">No team (shared)</SelectItem>
                                        {teams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-mono uppercase">
                                    Collection Image (Optional)
                                </Label>
                                <Input type="file" accept="image/*" onChange={handleImageSelect} />
                                {imagePreview ? (
                                    <div className="w-32 h-24 rounded-md overflow-hidden border border-border bg-muted">
                                        <img
                                            src={imagePreview}
                                            alt="Collection preview"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        clearDraft();
                                        setName("");
                                        setCompanyId("");
                                        setBrandId("");
                                        setTeamId(null);
                                        setTeamSelected(false);
                                        setImageFile(null);
                                        setImagePreview(null);
                                    }}
                                >
                                    Reset Draft
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        createCollection.isPending ||
                                        uploadCollectionImages.isPending ||
                                        !companyId ||
                                        !brandId ||
                                        !teamSelected
                                    }
                                >
                                    {createCollection.isPending ||
                                    uploadCollectionImages.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Collection"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
