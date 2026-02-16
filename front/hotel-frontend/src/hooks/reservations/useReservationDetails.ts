import { useQuery } from '@tanstack/react-query';
import { getReservationDetails } from '@/api/reservations';
import type { ReservationDto } from '@/api/types/reservations';

export const useReservationDetails = (id: number, options?: { enabled?: boolean }) => {
    return useQuery<ReservationDto>({
        queryKey: ['reservation', id],
        queryFn: () => getReservationDetails(id),
        enabled: (options?.enabled ?? true) && !!id && !isNaN(id),
        retry: false, // Don't retry if 404
    });
};
