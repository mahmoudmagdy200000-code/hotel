import { useQuery } from '@tanstack/react-query';
import { searchReservations } from '@/api/reception';
import type { ReceptionSearchResultDto } from '@/api/types/reception';

export const useReceptionSearch = (query: string, date?: string) => {
    return useQuery<ReceptionSearchResultDto>({
        queryKey: ['reception', 'search', query, date],
        queryFn: () => searchReservations({ query, date }),
        enabled: query.length >= 2,
        staleTime: 1000 * 60, // 1 minute
    });
};
