/**
 * Hook for fetching revenue/financial summary data
 * Uses React Query for caching and refetching
 */

import { useQuery } from '@tanstack/react-query';
import { getRevenueSummary } from '@/api/dashboard';
import type { GetRevenueSummaryParams, RevenueSummaryDto } from '@/api/types/dashboard';

export const revenueSummaryQueryKeys = {
    all: ['revenueSummary'] as const,
    list: (params: GetRevenueSummaryParams) => ['revenueSummary', params] as const,
};

export const useRevenueSummary = (params: GetRevenueSummaryParams = {}) => {
    return useQuery<RevenueSummaryDto>({
        queryKey: revenueSummaryQueryKeys.list(params),
        queryFn: () => getRevenueSummary(params),
        staleTime: 60 * 1000, // 1 minute
    });
};
