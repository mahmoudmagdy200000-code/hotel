import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadPdfReservation } from '@/api/reception';

export const useUploadPdfReservation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ file, listingId }: { file: File, listingId: string }) => uploadPdfReservation(file, listingId),
        onSuccess: () => {
            // Refresh the pending requests list after a successful upload
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });
};
