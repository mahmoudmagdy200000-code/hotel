import { useQuery } from '@tanstack/react-query';
import { searchReservations } from '@/api/reception';
import type { ReceptionSearchResultDto } from '@/api/types/reception';

export const useReceptionSearch = (query: string, date?: string) => {
    return useQuery<ReceptionSearchResultDto>({
        queryKey: ['reception', 'search', query, date],
        queryFn: ({ signal }) => searchReservations({ query, date }, signal),
        enabled: query.length >= 3,
        staleTime: 1000 * 60, // 1 minute
    });
};
