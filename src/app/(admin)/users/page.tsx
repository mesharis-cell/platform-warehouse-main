"use client";

import { AdminHeader } from "@/components/admin-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { useUsers } from "@/hooks/use-users";
import { Search, Users } from "lucide-react";
import { useMemo, useState } from "react";

export default function UsersManagementPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [filterTemplate, setFilterTemplate] = useState<string>("all");
	const [filterActive, setFilterActive] = useState<string>("all");

	// Build query params
	const queryParams = useMemo(() => {
		const params: Record<string, string> = {};
		if (filterTemplate !== "all")
			params.permission_template = filterTemplate;
		if (filterActive !== "all")
			params.is_active = filterActive === "active" ? "true" : "false";
		if (searchQuery) params.search_term = searchQuery;
		return params;
	}, [filterTemplate, filterActive, searchQuery]);

	// Fetch data
	const { data: usersData, isLoading: loading } = useUsers(queryParams);
	const users = usersData?.data || [];

	return (
		<div className="min-h-screen bg-background">
			<AdminHeader
				icon={Users}
				title="USER MANAGEMENT"
				description="Create · Permissions · Access Control"
				stats={usersData ? { label: 'TOTAL USERS', value: usersData.meta.total } : undefined}
			/>

			{/* Main Content */}
			<main className="container mx-auto px-6 py-8">
				{/* Controls Bar */}
				<div className="flex flex-col lg:flex-row gap-4 mb-8">
					{/* Search */}
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or email..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10 font-mono"
						/>
					</div>

					{/* Filters */}
					<div className="flex gap-2">
						<Select value={filterTemplate} onValueChange={setFilterTemplate}>
							<SelectTrigger className="w-[180px] font-mono">
								<SelectValue placeholder="Filter by template" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Templates</SelectItem>
								<SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
								<SelectItem value="LOGISTICS_STAFF">Logistics Staff</SelectItem>
								<SelectItem value="CLIENT_USER">Client User</SelectItem>
							</SelectContent>
						</Select>

						<Select value={filterActive} onValueChange={setFilterActive}>
							<SelectTrigger className="w-[150px] font-mono">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div >

				{/* Users Table */}
				< div className="bg-card border border-border rounded-xl overflow-hidden" >
					<Table>
						<TableHeader>
							<TableRow className="border-border/50">
								<TableHead className="font-mono uppercase text-xs">
									User
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Template
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Permissions
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Company
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Status
								</TableHead>
								<TableHead className="font-mono uppercase text-xs">
									Last Login
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{loading ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-12">
										<p className="text-muted-foreground font-mono">
											Loading users...
										</p>
									</TableCell>
								</TableRow>
							) : users.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="text-center py-12">
										<p className="text-muted-foreground font-mono">
											No users found
										</p>
									</TableCell>
								</TableRow>
							) : (
								users.map((user) => (
									<TableRow key={user.id} className="border-border/50">
										<TableCell>
											<div>
												<p className="font-mono font-semibold">{user.name}</p>
												<p className="text-xs text-muted-foreground font-mono">
													{user.email}
												</p>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="font-mono text-xs border-border/50 text-muted-foreground bg-muted/10">
												{user.permission_template || "Custom"}
											</Badge>
										</TableCell>
										<TableCell>
											<span className="text-xs font-mono text-muted-foreground">
												{user.permissions.length} permissions
											</span>
										</TableCell>
										<TableCell>
											<span className="font-mono text-xs">
												{user.company
													? user.company.name
													: "-"}
											</span>
										</TableCell>
										<TableCell>
											{user.is_active ? (
												<Badge
													variant="outline"
													className="font-mono text-xs border-primary/30 text-primary"
												>
													Active
												</Badge>
											) : (
												<Badge
													variant="outline"
													className="font-mono text-xs border-destructive/30 text-destructive"
												>
													Inactive
												</Badge>
											)}
										</TableCell>
										<TableCell>
											<span className="text-xs text-muted-foreground font-mono">
												{user.last_login_at
													? new Date(user.last_login_at).toLocaleDateString()
													: "Never"}
											</span>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div >

				{/* Summary */}
				< div className="mt-6 flex items-center justify-between text-xs text-muted-foreground font-mono" >
					<p>Total users: {users.length}</p>
					<p>
						Active: {users.filter((u) => u.is_active).length} • Inactive:{" "}
						{users.filter((u) => !u.is_active).length}
					</p>
				</div >
			</main >
		</div >
	);
}
