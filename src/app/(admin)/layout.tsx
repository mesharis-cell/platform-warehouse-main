"use client";

/**
 * Admin Layout - Warehouse Operations Command Center
 *
 * Industrial logistics aesthetic with technical precision:
 * - Dark sidebar with grid overlay and zone markers
 * - Bold mono typography with uppercase headers
 * - Orange accent highlights for active states
 * - Role-based navigation filtering
 * - Animated loading states
 * - Collapsible sidebar with SidebarTrigger
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Users,
    Building,
    Warehouse,
    Grid3x3,
    Tag,
    Package,
    Layers,
    DollarSign,
    ShoppingCart,
    ScanLine,
    AlertCircle,
    LogOut,
    Box,
    Lock,
    Calendar,
    ClipboardList,
    FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Providers from "@/providers";
import { toast } from "sonner";
import { useToken } from "@/lib/auth/use-token";
import { usePlatform } from "@/contexts/platform-context";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { WAREHOUSE_NAV_PERMISSIONS } from "@/lib/auth/permission-map";

type NavItem = {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    requiredAnyPermission?: readonly string[];
};

type NavSection = {
    title: string;
    items: NavItem[];
};

const navigationSections: NavSection[] = [
    {
        title: "Operations",
        items: [
            {
                name: "Orders",
                href: "/orders",
                icon: ShoppingCart,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.orders,
            },
            {
                name: "Pricing Review",
                href: "/orders/pricing-review",
                icon: DollarSign,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.pricingReview,
            },
            {
                name: "Service Requests",
                href: "/service-requests",
                icon: ClipboardList,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.serviceRequests,
            },
            {
                name: "New Stock Requests",
                href: "/inbound-request",
                icon: Package,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.inboundRequest,
            },
            {
                name: "Scanning",
                href: "/scanning",
                icon: ScanLine,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.scanning,
            },
            {
                name: "Event Calendar",
                href: "/event-calendar",
                icon: Calendar,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.eventCalendar,
            },
            {
                name: "Reports & Exports",
                href: "/reports",
                icon: FileSpreadsheet,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.reports,
            },
        ],
    },
    {
        title: "Inventory",
        items: [
            {
                name: "Assets",
                href: "/assets",
                icon: Package,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.assets,
            },
            {
                name: "Collections",
                href: "/collections",
                icon: Layers,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.collections,
            },
            {
                name: "Conditions",
                href: "/conditions",
                icon: AlertCircle,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.conditions,
            },
        ],
    },
    {
        title: "Setup",
        items: [
            {
                name: "Companies",
                href: "/companies",
                icon: Users,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.companies,
            },
            {
                name: "Warehouses",
                href: "/warehouses",
                icon: Warehouse,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.warehouses,
            },
            {
                name: "Zones",
                href: "/zones",
                icon: Grid3x3,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.zones,
            },
            {
                name: "Brands",
                href: "/brands",
                icon: Tag,
                requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.brands,
            },
        ],
    },
];

const mobileTabs: NavItem[] = [
    {
        name: "Scan",
        href: "/scanning",
        icon: ScanLine,
        requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.scanning,
    },
    {
        name: "Orders",
        href: "/orders",
        icon: ShoppingCart,
        requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.orders,
    },
    {
        name: "Assets",
        href: "/assets",
        icon: Package,
        requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.assets,
    },
    {
        name: "Requests",
        href: "/service-requests",
        icon: ClipboardList,
        requiredAnyPermission: WAREHOUSE_NAV_PERMISSIONS.serviceRequests,
    },
];

function AdminSidebarContent() {
    const pathname = usePathname();
    const router = useRouter();
    const { state } = useSidebar();
    const { logout, user } = useToken();
    const { platform } = usePlatform();

    const handleSignOut = () => {
        logout();
        router.push("/");
        toast.success("You have been signed out.");
    };

    const isCollapsed = state === "collapsed";
    const visibleSections = navigationSections
        .map((section) => ({
            ...section,
            items: section.items.filter(
                (item) =>
                    !item.requiredAnyPermission ||
                    hasAnyPermission(user, item.requiredAnyPermission)
            ),
        }))
        .filter((section) => section.items.length > 0);

    const allVisibleItems = visibleSections.flatMap((section) => section.items);

    return (
        <>
            <SidebarHeader className="relative border-b border-border bg-white">
                {!isCollapsed && (
                    <div className="absolute top-4 left-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0">
                        ADMIN-01
                    </div>
                )}

                <div className="flex justify-center items-center gap-3 ">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 relative overflow-hidden shrink-0">
                        <Box className="h-5 w-5 text-primary relative z-10" strokeWidth={2.5} />
                        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                    </div>
                    {!isCollapsed && (
                        <div>
                            <h2 className="text-[16px] font-mono font-bold tracking-tight uppercase">
                                {platform?.platform_name}
                            </h2>
                            <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                                Operations Command
                            </p>
                        </div>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent className="p-3 overflow-y-auto bg-background">
                <SidebarMenu>
                    {visibleSections.map((section) => (
                        <div key={section.title}>
                            {!isCollapsed && (
                                <li className="px-3 pb-1 pt-3 first:pt-0 list-none">
                                    <div className="text-[10px] font-mono text-muted-foreground tracking-[0.18em] uppercase">
                                        {section.title}
                                    </div>
                                </li>
                            )}
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const matchingRoutes = allVisibleItems.filter(
                                    (navItem) =>
                                        pathname === navItem.href ||
                                        pathname.startsWith(navItem.href + "/")
                                );
                                const mostSpecificRoute = matchingRoutes.reduce(
                                    (longest, current) =>
                                        current.href.length > longest.href.length
                                            ? current
                                            : longest,
                                    matchingRoutes[0]
                                );
                                const isActive = mostSpecificRoute?.href === item.href;
                                return (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={isCollapsed ? item.name : undefined}
                                            className={cn(
                                                "group/nav-item flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all relative overflow-hidden",
                                                isActive
                                                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                                    : "text-foreground/70 hover:text-foreground hover:bg-muted"
                                            )}
                                        >
                                            <Link href={item.href}>
                                                {isActive && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30" />
                                                )}
                                                <Icon className="h-4 w-4 relative z-10 shrink-0" />
                                                {!isCollapsed && (
                                                    <>
                                                        <span className="flex-1 relative z-10 uppercase tracking-wide text-xs">
                                                            {item.name}
                                                        </span>
                                                        {item.badge && (
                                                            <span
                                                                className={cn(
                                                                    "px-1.5 py-0.5 text-[10px] font-mono rounded uppercase tracking-wider relative z-10 shrink-0",
                                                                    isActive
                                                                        ? "bg-primary-foreground/20 text-primary-foreground"
                                                                        : "bg-primary/10 text-primary border border-primary/20"
                                                                )}
                                                            >
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                                {!isActive && (
                                                    <div className="absolute inset-0 bg-primary/0 group-hover/nav-item:bg-primary/5 transition-colors" />
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </div>
                    ))}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="p-4 space-y-3 bg-background">
                {/* Divider with technical detail */}
                {!isCollapsed && (
                    <div className="px-2 py-2">
                        <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
                                User Profile
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>
                    </div>
                )}

                {/* User Profile Menu */}
                <>
                    <div className="flex items-center gap-3 px-2 py-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="rounded-full border-2 border-primary/20 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback className="bg-primary/10 text-primary font-mono text-sm font-bold">
                                            {user?.name?.charAt(0).toUpperCase() || "A"}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                align={isCollapsed ? "center" : "start"}
                            >
                                <DropdownMenuLabel className="font-mono text-xs uppercase tracking-wide">
                                    {user?.name || "Admin User"}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => router.push("/reset-password")}
                                    className="font-mono text-xs uppercase tracking-wide"
                                >
                                    <Lock className="h-3.5 w-3.5 mr-2" />
                                    Reset Password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onSelect={handleSignOut}
                                    className="font-mono text-xs uppercase tracking-wide text-destructive focus:text-destructive"
                                >
                                    <LogOut className="h-3.5 w-3.5 mr-2" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-mono font-semibold truncate">
                                    {user?.name || "Admin User"}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                                    {user?.role === "ADMIN" && "Admin"}
                                    {user?.role === "LOGISTICS" && "Logistics"}
                                </p>
                            </div>
                        )}
                    </div>
                </>

                {/* Bottom zone marker */}
                {!isCollapsed && (
                    <div className="text-[9px] font-mono text-muted-foreground/30 tracking-[0.2em] uppercase text-center pt-2">
                        Platform Asset Fulfillment v1.0
                    </div>
                )}
            </SidebarFooter>
        </>
    );
}

function MobileBottomTabs() {
    const pathname = usePathname();
    const { user } = useToken();
    const visibleTabs = mobileTabs.filter(
        (item) => !item.requiredAnyPermission || hasAnyPermission(user, item.requiredAnyPermission)
    );

    if (visibleTabs.length === 0) return null;

    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div
                className="grid px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
                style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
            >
                {visibleTabs.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const isScanTab = item.href === "/scanning";
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 rounded-md py-2 text-[10px] font-mono uppercase tracking-wide transition-colors",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                                isScanTab && "font-semibold"
                            )}
                        >
                            <Icon className={cn("h-4 w-4", isScanTab && isActive && "scale-110")} />
                            <span>{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <SidebarProvider defaultOpen={true}>
                <div className="flex min-h-screen w-full bg-background">
                    {/* Industrial Command Center Sidebar */}
                    <Sidebar
                        collapsible="icon"
                        variant="sidebar"
                        className="hidden lg:flex border-r border-border bg-muted/30 sticky top-0"
                    >
                        {/* Grid pattern overlay */}
                        <div
                            className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{
                                backgroundImage: `
								linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
								linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
							`,
                                backgroundSize: "32px 32px",
                            }}
                        />

                        <AdminSidebarContent />
                    </Sidebar>

                    {/* Main Content */}
                    <SidebarInset className="pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
                        {children}
                    </SidebarInset>
                </div>
                <MobileBottomTabs />
            </SidebarProvider>
        </Providers>
    );
}
