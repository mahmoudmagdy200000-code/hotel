/**
 * Hook for fetching dashboard summary data
 * Uses React Query for caching and refetching
 */

import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/api/dashboard';
import type { GetDashboardParams, DashboardDto } from '@/api/types/dashboard';

export const dashboardQueryKeys = {
    all: ['dashboard'] as const,
    list: (params: GetDashboardParams) => ['dashboard', params] as const,
};

export const useDashboard = (params: GetDashboardParams = {}) => {
    return useQuery<DashboardDto>({
        queryKey: dashboardQueryKeys.list(params),
        queryFn: () => getDashboard(params),
        staleTime: 60 * 1000, // 1 minute
    });
};
