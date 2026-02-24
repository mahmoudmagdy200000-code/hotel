import { useQuery } from '@tanstack/react-query';
import { searchReservations } from '@/api/reservations';
import type { GetReservationsQuery, ReservationDto } from '@/api/types/reservations';

export const useReservationsList = (params: GetReservationsQuery) => {
    return useQuery<ReservationDto[]>({
        queryKey: ['reservations', params],
        queryFn: ({ signal }) => searchReservations(params, signal),
        enabled: !params.searchTerm || params.searchTerm.length >= 3,
    });
};
