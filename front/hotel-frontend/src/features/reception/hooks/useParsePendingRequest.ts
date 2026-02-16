import { useMutation, useQueryClient } from '@tanstack/react-query';
import { parsePendingRequest } from '@/api/reception';

export const useParsePendingRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => parsePendingRequest(id),
        onSuccess: () => {
            // Invalidate pending requests list
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });

            // Success handler can be used in component to show toast
        },
    });
};
