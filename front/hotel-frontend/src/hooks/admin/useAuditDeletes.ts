import { useQuery } from '@tanstack/react-query';
import { getReservationDeletes, type GetReservationDeletesQuery } from '@/api/admin';

export const useAuditDeletes = (params: GetReservationDeletesQuery) => {
    return useQuery({
        queryKey: ['admin', 'audit', 'deletes', params],
        queryFn: () => getReservationDeletes(params),
    });
};
