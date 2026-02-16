import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelReservation } from '@/api/reception';

export const useCancelPendingRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, reason }: { id: number; reason?: string }) => cancelReservation(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
};
