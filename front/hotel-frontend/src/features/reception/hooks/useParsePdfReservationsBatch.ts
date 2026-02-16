import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parsePdfReservationsBatch } from '@/api/reception';

export const useParsePdfReservationsBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (reservationIds: number[]) => parsePdfReservationsBatch(reservationIds),
        onSuccess: () => {
            // Invalidate pending requests to refresh the list
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
};
