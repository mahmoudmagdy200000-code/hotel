import type { ReceptionReservationItemDto } from '@/api/types/reception';

export interface CheckInPricingLockResult {
    /** True when the pricing fields must be disabled (non-Manual sources). */
    isPricingLocked: boolean;
    /** Human-readable explanation shown to the receptionist when locked. */
    lockReason: string | null;
}

/**
 * Derives whether the pricing inputs should be locked during Check-In.
 * The absolute truth comes from the backend's `isPriceLocked` property,
 * fully encapsulating the Domain logic.
 *
 * @param reservation The current reservation from the Reception list.
 */
export function useCheckInPricingLock(
    reservation: ReceptionReservationItemDto | null
): CheckInPricingLockResult {
    if (!reservation) {
        return { isPricingLocked: false, lockReason: null };
    }

    const { isPriceLocked } = reservation;

    const lockReason = isPriceLocked
        ? 'Contract price — imported from booking source. Cannot be altered at check-in.'
        : null;

    return { isPricingLocked: isPriceLocked, lockReason };
}
