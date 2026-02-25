"use client";

import { useState } from "react";
import { useCollections } from "@/hooks/use-collections";
import { useCompanies } from "@/hooks/use-companies";
import { useBrands } from "@/hooks/use-brands";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Search, Building2, Tag, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AdminHeader } from "@/components/admin-header";

export default function CollectionsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCompany, setSelectedCompany] = useState<string>("");
    const [selectedBrand, setSelectedBrand] = useState<string>("");

    // Fetch data
    const { data: collectionsData, isLoading } = useCollections({
        search_term: searchQuery || undefined,
        company_id: selectedCompany && selectedCompany !== "" ? selectedCompany : undefined,
        brand_id: selectedBrand && selectedBrand !== "" ? selectedBrand : undefined,
        limit: 100,
    });

    const { data: companiesData } = useCompanies({ limit: "100" });

    // Brands for filter dropdown (based on selectedCompany)
    const { data: brandsData } = useBrands({
        company_id:
            selectedCompany && selectedCompany !== "" && selectedCompany !== ""
                ? selectedCompany
                : undefined,
        limit: "100",
    });

    const collections = collectionsData?.data || [];
    const companies = companiesData?.data || [];
    const brands = brandsData?.data || [];

    return (
        <div className="min-h-screen bg-background">
            <AdminHeader
                icon={Layers}
                title="COLLECTION CATALOG"
                description="Asset Bundles · Pre-configured Sets · Quick Ordering"
                stats={
                    collectionsData
                        ? {
                              label: "TOTAL COLLECTIONS",
                              value: collectionsData.data.length,
                          }
                        : undefined
                }
            />

            <div className="p-8">
                {/* Filters */}
                <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search collections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Company Filter */}
                    <Select
                        value={selectedCompany}
                        onValueChange={(value) => {
                            setSelectedCompany(value);
                            setSelectedBrand("");
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All companies" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="_all_">All companies</SelectItem>
                            {companies.map((company) => (
                                <SelectItem key={company.id} value={company.id}>
                                    {company.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Brand Filter */}
                    <Select
                        value={selectedBrand}
                        onValueChange={setSelectedBrand}
                        disabled={!selectedCompany || selectedCompany === "_all_"}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All brands" />
                        </SelectTrigger>
                        <SelectContent>
                            {brands.length > 0 ? (
                                <>
                                    <SelectItem value="_all_">All brands</SelectItem>
                                    {brands.map((brand) => (
                                        <SelectItem key={brand.id} value={brand.id}>
                                            {brand.name}
                                        </SelectItem>
                                    ))}
                                </>
                            ) : (
                                <SelectItem value="_all_" disabled>
                                    No brands available
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>

                {/* Collections Grid */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <Card key={i} className="overflow-hidden">
                                <div className="aspect-video bg-muted animate-pulse" />
                                <CardContent className="p-6 space-y-3">
                                    <div className="h-6 bg-muted rounded animate-pulse" />
                                    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : collections.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No collections found</h3>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {collections.map((collection) => (
                            <Card
                                key={collection.id}
                                className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                            >
                                <Link href={`/collections/${collection.id}`}>
                                    <div className="aspect-video bg-muted relative overflow-hidden">
                                        {collection.images.length > 0 ? (
                                            <Image
                                                src={collection.images[0]}
                                                alt={collection.name}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Layers className="w-16 h-16 text-muted-foreground/30" />
                                            </div>
                                        )}

                                        {/* Overlay with item count */}
                                        <Badge variant="default" className="backdrop-blur-sm">
                                            {(collection as any).assets?.length ?? 0}{" "}
                                            {((collection as any).assets?.length ?? 0) === 1
                                                ? "item"
                                                : "items"}
                                        </Badge>
                                    </div>
                                </Link>

                                <CardContent className="p-6 space-y-4">
                                    <div>
                                        <Link href={`/collections/${collection.id}`}>
                                            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                                                {collection.name}
                                            </h3>
                                        </Link>
                                        {collection.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {collection.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {collection.company?.name && (
                                            <Badge variant="outline" className="gap-1.5">
                                                <Building2 className="w-3 h-3" />
                                                {collection.company?.name}
                                            </Badge>
                                        )}
                                        {collection.brand?.name && (
                                            <Badge variant="outline" className="gap-1.5">
                                                <Tag className="w-3 h-3" />
                                                {collection.brand?.name}
                                            </Badge>
                                        )}
                                        {collection.category && (
                                            <Badge variant="outline" className="gap-1.5">
                                                {collection.category}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-border">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                            asChild
                                        >
                                            <Link href={`/collections/${collection.id}`}>
                                                View Details
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Results count */}
                {!isLoading && collectionsData?.data?.length > 0 && (
                    <div className="mt-8 text-center text-sm text-muted-foreground">
                        Showing {collectionsData?.data?.length} collection
                        {collectionsData?.data?.length !== 1 ? "s" : ""}
                    </div>
                )}
            </div>
        </div>
    );
}
