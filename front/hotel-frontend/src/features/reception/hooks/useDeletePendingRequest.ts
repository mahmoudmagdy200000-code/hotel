import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePendingRequest } from '@/api/reception';

/**
 * Hook to delete a pending PDF reservation (Draft status only).
 * Uses DELETE /api/pdf-reservations/{id} endpoint.
 * Will fail with 409 Conflict if the reservation has already been confirmed.
 */
export const useDeletePendingRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason?: string }) => deletePendingRequest(id, reason),
        onSuccess: () => {
            // Invalidate pending requests list
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
            // Also invalidate reception today in case it affects arrivals
            queryClient.invalidateQueries({ queryKey: ['reception', 'today'] });
        },
    });
};
