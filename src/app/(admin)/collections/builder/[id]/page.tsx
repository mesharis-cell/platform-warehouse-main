"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Layers, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCollection } from "@/hooks/use-collections";
import Image from "next/image";

export default function CollectionBuilderPage() {
    const params = useParams();
    const collectionId = params?.id as string;
    const draftKey = `warehouse.collectionBuilderDraft.${collectionId}`;
    const lastActiveKey = "warehouse.collectionBuilder.lastActive";
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const { data: collectionResponse, isLoading } = useCollection(collectionId);
    const collection = collectionResponse?.data;

    useEffect(() => {
        if (!collectionId) return;
        const session = { collectionId, lastVisitedAt: Date.now() };
        localStorage.setItem(draftKey, JSON.stringify(session));
        localStorage.setItem(lastActiveKey, JSON.stringify(session));
    }, [collectionId, draftKey, lastActiveKey, collection?.assets?.length]);

    useEffect(() => {
        if (!isLoading && !collection) {
            const raw = localStorage.getItem(lastActiveKey);
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw) as { collectionId?: string };
                if (parsed.collectionId === collectionId) {
                    localStorage.removeItem(lastActiveKey);
                }
            } catch {
                localStorage.removeItem(lastActiveKey);
            }
        }
    }, [collectionId, isLoading, lastActiveKey, collection]);

    const assetCards = useMemo(() => collection?.assets || [], [collection?.assets]);
    const builderReturnTo = `/collections/builder/${collectionId}`;
    const createAssetHref = `/assets/create?flow=collection-builder&collectionId=${collectionId}&returnTo=${encodeURIComponent(builderReturnTo)}`;

    useEffect(() => {
        if (!scrollRef.current || assetCards.length === 0) return;

        requestAnimationFrame(() => {
            if (!scrollRef.current) return;
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        });
    }, [assetCards.length, collectionId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background p-4">
                <Card className="max-w-3xl mx-auto">
                    <CardContent className="p-6 text-sm text-muted-foreground">
                        Loading collection builder...
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!collection) {
        return (
            <div className="min-h-screen bg-background p-4">
                <Card className="max-w-3xl mx-auto">
                    <CardContent className="p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">Collection not found.</p>
                        <Button asChild>
                            <Link href="/collections">Back to collections</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <Button variant="ghost" className="gap-2" asChild>
                    <Link href="/collections">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Collections
                    </Link>
                </Button>

                <Card>
                    <CardHeader className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle className="font-mono text-lg uppercase flex items-center gap-2">
                                <Layers className="h-5 w-5" />
                                Collection Builder
                            </CardTitle>
                            <Badge variant="outline" className="font-mono">
                                {assetCards.length} item{assetCards.length === 1 ? "" : "s"}
                            </Badge>
                        </div>
                        <div>
                            <p className="font-semibold text-base">{collection.name}</p>
                            <p className="text-sm text-muted-foreground">
                                Add assets and keep building this set. The plus card always stays at
                                the end.
                            </p>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono bg-muted/40 border border-border rounded px-3 py-2 inline-flex">
                            Progress saves locally. Use Continue Builder to resume.
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {assetCards.length === 0 ? (
                            <div className="h-[190px] flex items-center justify-center">
                                <Link
                                    href={createAssetHref}
                                    className="w-full max-w-[220px] h-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center p-3"
                                >
                                    <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                                        <Plus className="h-5 w-5 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium text-primary text-center">
                                        Create first asset
                                    </p>
                                    <p className="text-xs text-muted-foreground text-center mt-1">
                                        Reuses the standard asset flow
                                    </p>
                                </Link>
                            </div>
                        ) : (
                            <div ref={scrollRef} className="max-h-[392px] overflow-y-auto pr-1">
                                <div className="grid grid-cols-2 gap-3 auto-rows-[190px]">
                                    {assetCards.map((item: any) => (
                                        <Link
                                            key={item.id}
                                            href={`/assets/${item.asset?.id || item.asset_id}`}
                                            className="h-full rounded-lg border border-border overflow-hidden bg-card hover:border-primary/40 transition-colors"
                                        >
                                            <div className="h-[130px] bg-muted relative">
                                                {item?.asset?.images?.[0]?.url ? (
                                                    <Image
                                                        src={item.asset.images[0].url}
                                                        alt={item.asset?.name || "Asset"}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                                        <Package className="h-8 w-8" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <p className="text-xs font-medium line-clamp-2">
                                                    {item?.asset?.name ||
                                                        item?.asset_name ||
                                                        "Asset"}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-1">
                                                    Qty default: {item.default_quantity || 1}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}

                                    {assetCards.length % 2 === 0 ? (
                                        <div aria-hidden className="h-full rounded-lg" />
                                    ) : null}

                                    <Link
                                        href={createAssetHref}
                                        className="h-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center p-3"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center mb-2">
                                            <Plus className="h-5 w-5 text-primary" />
                                        </div>
                                        <p className="text-sm font-medium text-primary text-center">
                                            Create next asset
                                        </p>
                                        <p className="text-xs text-muted-foreground text-center mt-1">
                                            Reuses the standard asset flow
                                        </p>
                                    </Link>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" asChild>
                                <Link href="/collections">Exit Builder</Link>
                            </Button>
                            <Button asChild>
                                <Link href={createAssetHref}>Add Next Asset</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
