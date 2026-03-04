import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createExtraCharge, deleteExtraCharge } from '@/api/extraCharges';
import type { CreateExtraChargeCommand } from '@/api/types/extraCharges';

/**
 * Mutations for Extra Charges (Ancillary Income).
 *
 * On success, invalidates:
 *   - ['dashboard'] → refreshes Daily Revenue KPIs
 *   - ['cashflow']  → refreshes Net Cash in Drawer
 *   - ['reservation', reservationId] → refreshes the Reservation Details view
 */
export const useExtraChargeMutations = (reservationId: number) => {
    const queryClient = useQueryClient();

    const invalidateCaches = () => {
        // Dashboard KPIs reflect paid extra charges in TotalRevenue
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        // Net Cash in Drawer is affected by paid extra charges
        queryClient.invalidateQueries({ queryKey: ['cashflow'] });
        // The reservation detail view shows its own extra charges list
        queryClient.invalidateQueries({ queryKey: ['reservation', reservationId] });
    };

    const addCharge = useMutation({
        mutationFn: (command: CreateExtraChargeCommand) => createExtraCharge(command),
        onSuccess: invalidateCaches,
    });

    const removeCharge = useMutation({
        mutationFn: (chargeId: number) => deleteExtraCharge(chargeId),
        onSuccess: invalidateCaches,
    });

    return { addCharge, removeCharge };
};
