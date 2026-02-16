import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getConfirmationPlan, applyConfirmationPlan } from '@/api/reception';
import type { ConfirmAllocationRequest } from '@/api/types/reception';
import { toast } from 'sonner';

export const useGetConfirmationPlan = () => {
    return useMutation({
        mutationFn: (reservationIds: number[] | undefined) => getConfirmationPlan(reservationIds),
        onError: (err) => {
            toast.error("Failed to generate allocation plan.");
            console.error(err);
        }
    });
};

export const useApplyConfirmationPlan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: ConfirmAllocationRequest) => applyConfirmationPlan(request),
        onSuccess: (data) => {
            if (data.failedCount > 0) {
                toast.warning(`Confirmed ${data.confirmedCount} reservations. ${data.failedCount} failed.`);
                // If failures exist, we might want to show them? 
            } else {
                toast.success(`Successfully confirmed ${data.confirmedCount} reservations.`);
            }

            // Invalidate pending requests and main reservations
            queryClient.invalidateQueries({ queryKey: ['reception', 'pending-requests'] });
            queryClient.invalidateQueries({ queryKey: ['reception', 'reservations'] });
            queryClient.invalidateQueries({ queryKey: ['reception', 'today'] });
        },
        onError: (err) => {
            toast.error("Failed to apply confirmation plan.");
            console.error(err);
        }
    });
};
