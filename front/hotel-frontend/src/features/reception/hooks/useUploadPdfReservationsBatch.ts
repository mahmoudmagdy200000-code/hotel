import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadPdfReservationsBatch } from '@/api/reception';

export const useUploadPdfReservationsBatch = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ files, listingId }: { files: File[], listingId: string }) => uploadPdfReservationsBatch(files, listingId),
        onSuccess: () => {
            // Invalidate pending requests to refresh the list
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
};
