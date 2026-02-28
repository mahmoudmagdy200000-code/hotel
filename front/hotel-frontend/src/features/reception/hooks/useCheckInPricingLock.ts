import type { ReceptionReservationItemDto } from '@/api/types/reception';

/**
 * Reservation source constants — mirrors the backend ReservationSource enum.
 * Manual=1: Walk-in, price is negotiable at check-in.
 * All other sources (PDF=2, WhatsApp=3, Booking=4): Contract price is fixed.
 */
const MANUAL_SOURCE = 1;

export interface CheckInPricingLockResult {
    /** True when the pricing fields must be disabled (non-Manual sources). */
    isPricingLocked: boolean;
    /** Human-readable explanation shown to the receptionist when locked. */
    lockReason: string | null;
}

/**
 * Derives whether the pricing inputs should be locked during Check-In,
 * based solely on the booking source.
 *
 * Rule:
 *   - Manual (walk-in) → editable: receptionist may negotiate the price.
 *   - PDF / WhatsApp / Booking → read-only: contract price cannot be altered.
 *
 * @param reservation The current reservation from the Reception list.
 */
export function useCheckInPricingLock(
    reservation: ReceptionReservationItemDto | null
): CheckInPricingLockResult {
    if (!reservation) {
        return { isPricingLocked: false, lockReason: null };
    }

    const isPricingLocked = reservation.source !== MANUAL_SOURCE;

    const lockReason = isPricingLocked
        ? 'Contract price — imported from booking source. Cannot be altered at check-in.'
        : null;

    return { isPricingLocked, lockReason };
}
