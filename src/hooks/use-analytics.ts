"use client";

/**
 * Phase 14: Analytics React Query Hooks
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
    RevenueSummary,
    MarginSummary,
    CompanyBreakdown,
    TimeSeries,
    RevenueQueryParams,
    MarginQueryParams,
    CompanyBreakdownQueryParams,
    TimeSeriesQueryParams,
} from "@/types/analytics";
import { throwApiError } from "@/lib/utils/throw-api-error";
import { apiClient } from "@/lib/api/api-client";
import { useCompanyFilter } from "@/contexts/company-filter-context";

/**
 * Fetch revenue summary
 */
export function useRevenueSummary(params: RevenueQueryParams = {}) {
    const { selectedCompanyId } = useCompanyFilter();
    const hasExplicitCompany = params.companyId !== undefined;
    const effectiveParams = useMemo(
        () => ({
            ...params,
            companyId: hasExplicitCompany
                ? params.companyId || undefined
                : selectedCompanyId || undefined,
        }),
        [params, hasExplicitCompany, selectedCompanyId]
    );

    return useQuery({
        queryKey: ["analytics", "revenue", effectiveParams],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                if (effectiveParams.companyId)
                    searchParams.set("company_id", effectiveParams.companyId);
                if (effectiveParams.startDate)
                    searchParams.set("start_date", effectiveParams.startDate);
                if (effectiveParams.endDate) searchParams.set("end_date", effectiveParams.endDate);
                if (effectiveParams.timePeriod)
                    searchParams.set("time_period", effectiveParams.timePeriod);

                const response = await apiClient.get<RevenueSummary>(
                    `/operations/v1/analytics/revenue-summary?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 0,
    });
}

/**
 * Fetch margin summary
 */
export function useMarginSummary(params: MarginQueryParams = {}) {
    const { selectedCompanyId } = useCompanyFilter();
    const hasExplicitCompany = params.companyId !== undefined;
    const effectiveParams = useMemo(
        () => ({
            ...params,
            companyId: hasExplicitCompany
                ? params.companyId || undefined
                : selectedCompanyId || undefined,
        }),
        [params, hasExplicitCompany, selectedCompanyId]
    );

    return useQuery({
        queryKey: ["analytics", "margins", effectiveParams],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                if (effectiveParams.companyId)
                    searchParams.set("companyId", effectiveParams.companyId);
                if (effectiveParams.startDate)
                    searchParams.set("startDate", effectiveParams.startDate);
                if (effectiveParams.endDate) searchParams.set("endDate", effectiveParams.endDate);
                if (effectiveParams.timePeriod)
                    searchParams.set("timePeriod", effectiveParams.timePeriod);

                const response = await apiClient.get<MarginSummary>(
                    `/operations/v1/analytics/margin-summary?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 0,
    });
}

/**
 * Fetch company breakdown
 */
export function useCompanyBreakdown(params: CompanyBreakdownQueryParams = {}) {
    return useQuery({
        queryKey: ["analytics", "company-breakdown", params],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                if (params.startDate) searchParams.set("startDate", params.startDate);
                if (params.endDate) searchParams.set("endDate", params.endDate);
                if (params.timePeriod) searchParams.set("timePeriod", params.timePeriod);
                if (params.sortBy) searchParams.set("sortBy", params.sortBy);
                if (params.sortOrder) searchParams.set("sortOrder", params.sortOrder);

                const response = await apiClient.get<CompanyBreakdown>(
                    `/operations/v1/analytics/company-breakdown?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 0,
    });
}

/**
 * Fetch time series data
 */
export function useTimeSeries(params: TimeSeriesQueryParams) {
    const { selectedCompanyId } = useCompanyFilter();
    const hasExplicitCompany = params.companyId !== undefined;
    const effectiveParams = useMemo(
        () => ({
            ...params,
            companyId: hasExplicitCompany
                ? params.companyId || undefined
                : selectedCompanyId || undefined,
        }),
        [params, hasExplicitCompany, selectedCompanyId]
    );

    return useQuery({
        queryKey: ["analytics", "time-series", effectiveParams],
        queryFn: async () => {
            try {
                const searchParams = new URLSearchParams();

                searchParams.set("groupBy", effectiveParams.groupBy); // Required parameter

                if (effectiveParams.companyId)
                    searchParams.set("companyId", effectiveParams.companyId);
                if (effectiveParams.startDate)
                    searchParams.set("startDate", effectiveParams.startDate);
                if (effectiveParams.endDate) searchParams.set("endDate", effectiveParams.endDate);

                const response = await apiClient.get<TimeSeries>(
                    `/operations/v1/analytics/time-series?${searchParams.toString()}`
                );

                return response.data;
            } catch (error) {
                throwApiError(error);
            }
        },
        staleTime: 0,
        enabled: !!effectiveParams.groupBy, // Only run query if groupBy is provided
    });
}
