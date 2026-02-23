"use client";

import { useCompanies } from "@/hooks/use-companies";
import { useCompanyFilter } from "@/contexts/company-filter-context";
import { Building2 } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CompanySelectorProps {
    className?: string;
}

export function CompanySelector({ className }: CompanySelectorProps) {
    const { selectedCompanyId, setSelectedCompanyId, isHydrated } = useCompanyFilter();
    const { data: companiesResponse, isLoading } = useCompanies({ limit: "100" });
    const companies = companiesResponse?.data || [];

    return (
        <div className={className}>
            <Select
                value={selectedCompanyId || "all"}
                onValueChange={(value) => setSelectedCompanyId(value === "all" ? null : value)}
                disabled={isLoading || !isHydrated}
            >
                <SelectTrigger className="w-[220px] h-9 font-mono text-xs">
                    <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                            {company.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
