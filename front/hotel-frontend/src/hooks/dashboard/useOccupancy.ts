/**
 * Hook for fetching occupancy forecast data
 * Uses React Query for caching and refetching
 */

import { useQuery } from '@tanstack/react-query';
import { getOccupancy } from '@/api/dashboard';
import type { GetOccupancyParams, OccupancySummaryDto } from '@/api/types/dashboard';

export const occupancyQueryKeys = {
    all: ['occupancy'] as const,
    list: (params: GetOccupancyParams) => ['occupancy', params] as const,
};

export const useOccupancy = (params: GetOccupancyParams = {}) => {
    return useQuery<OccupancySummaryDto>({
        queryKey: occupancyQueryKeys.list(params),
        queryFn: () => getOccupancy(params),
        staleTime: 60 * 1000, // 1 minute
    });
};
