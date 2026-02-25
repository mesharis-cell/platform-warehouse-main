"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { throwApiError } from "@/lib/utils/throw-api-error";

export interface Team {
    id: string;
    company_id: string;
    name: string;
    description?: string | null;
    can_other_teams_see: boolean;
    can_other_teams_book: boolean;
    members: { id: string; user: { id: string; name: string; email: string } }[];
}

async function fetchTeams(params?: Record<string, string>): Promise<{ data: Team[] }> {
    try {
        const searchParams = new URLSearchParams(params);
        const response = await apiClient.get(`/operations/v1/team?${searchParams}`);
        return response.data;
    } catch (error) {
        throwApiError(error);
    }
}

export function useTeams(params?: Record<string, string>) {
    return useQuery({
        queryKey: ["teams", params],
        queryFn: () => fetchTeams(params),
        enabled: !!params?.company_id,
    });
}
