import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmReservation } from '@/api/reception';

export const useConfirmPendingRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => confirmReservation(id),
        onSuccess: () => {
            // Remove from pending list
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
            // Also update today view (arrivals/departures)
            queryClient.invalidateQueries({ queryKey: ['reception', 'today'] });
            // Update reservations list (now includes the confirmed reservation)
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });
};
