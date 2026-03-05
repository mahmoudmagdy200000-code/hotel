import { isBefore, parseISO } from 'date-fns';

export interface ReservationStatusData {
    departureDate: string;
    status: string;
}

/**
 * Validates if a reservation is considered a "Late Checkout".
 * Business Rule: Departure time is in the past AND status is NOT Checked Out (or Cancelled/NoShow).
 * 
 * @param reservation The reservation data to check
 * @param currentTime The current reference time injected from the caller
 * @returns boolean
 */
export const isLateCheckout = (
    reservation: ReservationStatusData,
    currentTime: Date
): boolean => {
    // Only valid in-house statuses can be late checkouts
    if (reservation.status === 'CheckedOut' ||
        reservation.status === 'Cancelled' ||
        reservation.status === 'NoShow') {
        return false;
    }

    try {
        const departureDateTime = parseISO(reservation.departureDate);
        return isBefore(departureDateTime, currentTime);
    } catch {
        return false;
    }
};
