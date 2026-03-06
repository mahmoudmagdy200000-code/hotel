import { useMemo } from 'react';
import { ReservationStatus } from '@/api/types/reservations';
import type { ReservationDto } from '@/api/types/reservations';

/**
 * Business rule: The refund button is visible only if:
 * 1. Reservation status is CheckedIn OR CheckedOut
 * 2. maxRefundable > 0 (totalPaid - totalRefunded > 0)
 *
 * Since the backend already deducts refunds from TotalAmount,
 * the maxRefundable is simply the current TotalAmount minus
 * the sum of all existing Refund-type payments.
 * However, we don't currently receive payments list in ReservationDto.
 * So we use `totalAmount` as the ceiling (backend enforces the cap).
 */

export interface RefundEligibility {
    /** Whether the refund button should be visible */
    isEligible: boolean;
    /** Maximum amount the user can refund */
    maxRefundable: number;
    /** Human-readable reason if not eligible */
    reason?: string;
}

export const useRefundEligibility = (reservation: ReservationDto | undefined): RefundEligibility => {
    return useMemo(() => {
        if (!reservation) {
            return { isEligible: false, maxRefundable: 0, reason: 'No reservation data' };
        }

        const isEligibleStatus =
            reservation.status === ReservationStatus.CheckedIn ||
            reservation.status === ReservationStatus.CheckedOut;

        if (!isEligibleStatus) {
            return {
                isEligible: false,
                maxRefundable: 0,
                reason: `Refunds are only available for CheckedIn or CheckedOut reservations (current: ${reservation.status})`,
            };
        }

        // The backend maintains: TotalAmount = OriginalAmount - SumOfRefunds
        // So current totalAmount IS the max refundable amount.
        const maxRefundable = reservation.totalAmount;

        if (maxRefundable <= 0) {
            return {
                isEligible: false,
                maxRefundable: 0,
                reason: 'No refundable amount remaining',
            };
        }

        return { isEligible: true, maxRefundable };
    }, [reservation]);
};
