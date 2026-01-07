"use client";

import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useWarehouses } from "@/hooks/use-warehouses";

import {
	Archive,
	Globe,
	MapPin,
	Search,
	Warehouse,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function WarehousesPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [countryFilter, setCountryFilter] = useState("");
	const [cityFilter, setCityFilter] = useState("");
	const [includeArchived, setIncludeArchived] = useState(false);

	// Build query params
	const queryParams = useMemo(() => {
		const params: Record<string, string> = {
			limit: "100",
			page: "1",
		};
		if (searchQuery) params.search_term = searchQuery;
		if (countryFilter) params.country = countryFilter;
		if (cityFilter) params.city = cityFilter;
		if (includeArchived) params.include_inactive = "true";
		return params;
	}, [searchQuery, countryFilter, cityFilter, includeArchived]);

	// Fetch warehouses
	const { data, isLoading: loading } = useWarehouses(queryParams);
	const warehouses = data?.data || [];
	const total = data?.meta?.total || 0;

	// Get unique countries and cities for filters
	const uniqueCountries = Array.from(
		new Set(warehouses.map((w) => w.country)),
	).sort();
	const uniqueCities = Array.from(
		new Set(warehouses.map((w) => w.city)),
	).sort();

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={Warehouse}
				title="WAREHOUSE REGISTRY"
				description="Physical Locations · Capacity · Operations"
				stats={{ label: 'ACTIVE FACILITIES', value: total }}
			/>

			{/* Control Panel with Geographic Filters */}
			<div className="border-b border-border bg-card px-8 py-4">
				<div className="flex items-center gap-4">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search warehouses..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 font-mono text-sm"
						/>
					</div>

					{uniqueCountries.length > 0 && (
						<select
							value={countryFilter}
							onChange={(e) => setCountryFilter(e.target.value)}
							className="h-9 px-3 rounded-md border border-input bg-background font-mono text-sm"
						>
							<option value="">All Countries</option>
							{uniqueCountries.map((country) => (
								<option key={country} value={country}>
									{country}
								</option>
							))}
						</select>
					)}

					{uniqueCities.length > 0 && (
						<select
							value={cityFilter}
							onChange={(e) => setCityFilter(e.target.value)}
							className="h-9 px-3 rounded-md border border-input bg-background font-mono text-sm"
						>
							<option value="">All Cities</option>
							{uniqueCities.map((city) => (
								<option key={city} value={city}>
									{city}
								</option>
							))}
						</select>
					)}

					<Button
						variant={includeArchived ? "default" : "outline"}
						size="sm"
						onClick={() => setIncludeArchived(!includeArchived)}
						className="gap-2 font-mono text-xs"
					>
						<Archive className="h-3.5 w-3.5" />
						{includeArchived ? "HIDE ARCHIVED" : "SHOW ARCHIVED"}
					</Button>
				</div>
			</div>

			{/* Data Table */}
			<div className="px-8 py-6">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<div className="text-sm font-mono text-muted-foreground animate-pulse">
							LOADING NETWORK...
						</div>
					</div>
				) : warehouses.length === 0 ? (
					<div className="text-center py-12 space-y-3">
						<Warehouse className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
						<p className="font-mono text-sm text-muted-foreground">
							NO WAREHOUSES FOUND
						</p>
					</div>
				) : (
					<div className="border border-border rounded-lg overflow-hidden bg-card">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50 border-border/50">
									<TableHead className="font-mono text-xs font-bold">
										FACILITY
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										LOCATION
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										COORDINATES
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										ADDRESS
									</TableHead>
									<TableHead className="font-mono text-xs font-bold">
										STATUS
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{warehouses.map((warehouse, index) => (
									<TableRow
										key={warehouse.id}
										className="group hover:bg-muted/30 transition-colors border-border/50"
										style={{
											animationDelay: `${index * 50}ms`,
										}}
									>
										<TableCell className="font-mono font-medium">
											<div className="flex items-center gap-2">
												<div className="h-8 w-8 rounded bg-secondary/10 flex items-center justify-center">
													<Warehouse className="h-4 w-4 text-secondary" />
												</div>
												<div>
													<div className="font-bold">
														{warehouse.name}
													</div>
													<div className="text-xs text-muted-foreground">
														ID: {warehouse.id.slice(0, 8)}...
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell className="font-mono">
											<div className="space-y-1">
												<div className="flex items-center gap-2 text-sm">
													<Globe className="h-3.5 w-3.5 text-muted-foreground" />
													<span className="font-medium">
														{warehouse.country}
													</span>
												</div>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<MapPin className="h-3 w-3" />
													{warehouse.city}
												</div>
											</div>
										</TableCell>

										{/* Coordinates */}
										<TableCell className="font-mono">
											<div className="space-y-1">
												<div className="flex items-center gap-2 text-sm">
													{warehouse.coordinates?.lat ? <Globe className="h-3.5 w-3.5 text-muted-foreground" /> : null}
													<span className="font-medium">
														{warehouse.coordinates?.lat}
													</span>
												</div>
												<div className="flex items-center gap-2 text-sm">
													{warehouse.coordinates?.lng ? <MapPin className="h-3.5 w-3.5" /> : null}
													{warehouse.coordinates?.lng}
												</div>
											</div>
										</TableCell>

										<TableCell className="font-mono text-sm text-muted-foreground max-w-md">
											{warehouse.address}
										</TableCell>
										<TableCell>
											{!warehouse?.is_active ? (
												<Badge
													variant="outline"
													className="font-mono text-xs border-destructive/30 text-destructive"
												>
													ARCHIVED
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="font-mono text-xs border-primary/30 text-primary"
												>
													OPERATIONAL
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
				ZONE: ADMIN-WAREHOUSES · SEC-LEVEL: PMG-ADMIN
			</div>
		</div>
	);
}
