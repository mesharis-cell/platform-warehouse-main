"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanies } from "@/hooks/use-companies";
import { useCreateCollection, useUploadCollectionImages } from "@/hooks/use-collections";
import { toast } from "sonner";

const DRAFT_KEY = "warehouse.collectionCreateDraft";

interface CollectionCreateDraft {
    name: string;
    companyId: string;
    imagePreview?: string;
}

export default function CollectionCreatePage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const { data: companiesResponse } = useCompanies({ limit: "100" });
    const companies = companiesResponse?.data || [];

    const createCollection = useCreateCollection();
    const uploadCollectionImages = useUploadCollectionImages();

    useEffect(() => {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
            try {
                const draft = JSON.parse(raw) as CollectionCreateDraft;
                setName(draft.name || "");
                setCompanyId(draft.companyId || "");
                if (draft.imagePreview) setImagePreview(draft.imagePreview);
            } catch {
                // ignore broken draft
            }
        }
    }, []);

    useEffect(() => {
        if (!companyId && companies.length > 0) {
            setCompanyId(companies[0].id);
        }
    }, [companies, companyId]);

    useEffect(() => {
        const draft: CollectionCreateDraft = {
            name,
            companyId,
            imagePreview: imagePreview || undefined,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [name, companyId, imagePreview]);

    const companyName = useMemo(
        () => companies.find((company) => company.id === companyId)?.name || "",
        [companies, companyId]
    );

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
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

        try {
            let imageUrls: string[] = [];
            if (imageFile) {
                const uploadResponse = await uploadCollectionImages.mutateAsync([imageFile]);
                imageUrls = uploadResponse?.data?.imageUrls || [];
            }

            const created = await createCollection.mutateAsync({
                company_id: companyId,
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
                            Start with a collection name and optional photo, then add assets in the
                            builder grid.
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
                                <Label className="text-xs font-mono uppercase">Company</Label>
                                <div className="h-11 px-3 border border-border rounded-md bg-muted/30 flex items-center text-sm font-mono">
                                    {companyName || "Loading..."}
                                </div>
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
                                        uploadCollectionImages.isPending
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
