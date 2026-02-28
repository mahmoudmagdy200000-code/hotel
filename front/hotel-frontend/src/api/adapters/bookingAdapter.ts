import type { ReservationDto } from "@/api/types/reservations";
import type { ReceptionReservationItemDto } from "@/api/types/reception";

export interface BookingDisplayData {
    id: number;
    guestName: string;
    guestInitials: string;
    phone?: string;
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    status: string;
    totalAmount: number;
    balanceDue: number;
    currency: string;
    roomTypeNames: string[];
    roomNumbers: string[];
    mealPlan?: string;
    isPriceLocked: boolean;
    isEarlyCheckOut?: boolean;
}

export const mapReservationDto = (res: ReservationDto): BookingDisplayData => ({
    id: res.id,
    guestName: res.guestName,
    guestInitials: res.guestName.substring(0, 1).toUpperCase(),
    phone: res.phone ?? undefined,
    bookingNumber: res.bookingNumber || '', // Assuming it might be added or mapping to Hash
    checkInDate: res.checkInDate,
    checkOutDate: res.checkOutDate,
    status: getStatusString(res.status),
    totalAmount: res.totalAmount,
    balanceDue: res.balanceDue,
    currency: res.currency,
    roomTypeNames: res.lines.map(l => l.roomTypeName).filter(Boolean),
    roomNumbers: res.lines.map(l => l.roomNumber).filter(Boolean),
    mealPlan: res.mealPlan ?? undefined,
    isPriceLocked: res.isPriceLocked,
    isEarlyCheckOut: res.isEarlyCheckOut
});

export const mapReceptionDto = (res: ReceptionReservationItemDto): BookingDisplayData => ({
    id: res.reservationId,
    guestName: res.guestName,
    guestInitials: res.guestName.substring(0, 1).toUpperCase(),
    phone: res.phone ?? undefined,
    bookingNumber: res.bookingNumber,
    checkInDate: res.checkIn,
    checkOutDate: res.checkOut,
    status: res.status,
    totalAmount: res.totalAmount,
    balanceDue: res.balanceDue,
    currency: res.currency,
    roomTypeNames: res.roomTypeNames,
    roomNumbers: res.roomNumbers,
    mealPlan: res.mealPlan ?? undefined,
    isPriceLocked: res.isPriceLocked,
    isEarlyCheckOut: res.isEarlyCheckOut
});

const getStatusString = (status: number): string => {
    switch (status) {
        case 1: return 'Draft';
        case 2: return 'Confirmed';
        case 3: return 'CheckedIn';
        case 4: return 'CheckedOut';
        case 5: return 'Cancelled';
        case 6: return 'NoShow';
        default: return 'Unknown';
    }
};
