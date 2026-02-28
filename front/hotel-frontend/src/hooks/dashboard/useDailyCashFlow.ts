import { useQuery } from '@tanstack/react-query';
import { getDailyCashFlow } from '@/api/dashboard';
import type { GetDailyCashFlowParams } from '@/api/types/dashboard';

export const useDailyCashFlow = (params: GetDailyCashFlowParams) => {
    return useQuery({
        queryKey: ['daily-cash-flow', params],
        queryFn: () => getDailyCashFlow(params),
        enabled: !!params.businessDate,
        staleTime: 1000 * 60, // 1 minute
    });
};
