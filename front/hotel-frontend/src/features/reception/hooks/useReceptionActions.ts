import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    checkInReservation,
    checkOutReservation,
    confirmReservation,
    cancelReservation,
    noShowReservation,
    parsePendingRequest
} from '@/api/reception';
import { getReservationDetails, updateReservation } from '@/api/reservations';
import type { PaymentMethodValue, CurrencyCodeValue } from '@/api/types/reservations';


export const useReceptionActions = () => {
    const queryClient = useQueryClient();

    const parse = useMutation({
        mutationFn: (id: number) => parsePendingRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });

    const checkIn = useMutation({
        mutationFn: async ({ id, businessDate, guestName, phone, bookingNumber, checkInDate, checkOutDate, totalAmount, balanceDue, paymentMethod, currencyCode, roomAssignments }: {
            id: number;
            businessDate: string;
            guestName?: string;
            phone?: string;
            bookingNumber?: string;
            checkInDate?: string;
            checkOutDate?: string;
            totalAmount?: number;
            balanceDue?: number;
            paymentMethod?: PaymentMethodValue;
            currencyCode?: CurrencyCodeValue;
            roomAssignments?: Array<{ lineId: number; roomId: number }>;
        }) => {
            if (roomAssignments && roomAssignments.length > 0) {
                const details = await getReservationDetails(id);

                const newLines = details.lines.map(line => {
                    const assignment = roomAssignments.find(a => a.lineId === line.id);
                    return {
                        roomId: assignment ? assignment.roomId : line.roomId,
                        ratePerNight: line.ratePerNight
                    };
                });

                const checkInDateNormalized = checkInDate ? (checkInDate.includes('T') ? checkInDate.split('T')[0] : checkInDate) : null;
                const checkOutDateNormalized = checkOutDate ? (checkOutDate.includes('T') ? checkOutDate.split('T')[0] : checkOutDate) : null;
                const origCheckIn = details.checkInDate ? (details.checkInDate.includes('T') ? details.checkInDate.split('T')[0] : details.checkInDate) : null;
                const origCheckOut = details.checkOutDate ? (details.checkOutDate.includes('T') ? details.checkOutDate.split('T')[0] : details.checkOutDate) : null;

                const hasRoomChanges = newLines.some((nl, i) => nl.roomId !== details.lines[i].roomId);
                const hasHeaderChanges =
                    (guestName !== undefined && guestName !== details.guestName) ||
                    (phone !== undefined && phone !== details.phone) ||
                    (balanceDue !== undefined && balanceDue !== details.balanceDue) ||
                    (paymentMethod !== undefined && paymentMethod !== details.paymentMethod) ||
                    (currencyCode !== undefined && currencyCode !== details.currencyCode) ||
                    (checkInDateNormalized !== null && checkInDateNormalized !== origCheckIn) ||
                    (checkOutDateNormalized !== null && checkOutDateNormalized !== origCheckOut);

                if (hasRoomChanges || hasHeaderChanges) {
                    await updateReservation(id, {
                        ...details,
                        guestName: guestName !== undefined ? guestName : details.guestName,
                        phone: phone !== undefined ? phone : details.phone,
                        checkInDate: checkInDateNormalized || details.checkInDate,
                        checkOutDate: checkOutDateNormalized || details.checkOutDate,
                        lines: newLines,
                        balanceDue: balanceDue !== undefined ? balanceDue : details.balanceDue,
                        paymentMethod: paymentMethod !== undefined ? paymentMethod : details.paymentMethod,
                        currencyCode: currencyCode !== undefined ? currencyCode : details.currencyCode,
                    });
                }
            }

            return checkInReservation(id, businessDate, guestName, phone, bookingNumber, checkInDate, checkOutDate, totalAmount, balanceDue, paymentMethod, currencyCode, roomAssignments);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reception'] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });

    const checkOut = useMutation({
        mutationFn: ({ id, businessDate, balanceDue, paymentMethod }: { id: number; businessDate: string; balanceDue?: number; paymentMethod?: PaymentMethodValue }) =>
            checkOutReservation(id, businessDate, balanceDue, paymentMethod),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reception'] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });

    const confirm = useMutation({
        mutationFn: (id: number) => confirmReservation(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reception'] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });

    const cancel = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
            cancelReservation(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reception'] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });

    const noShow = useMutation({
        mutationFn: ({ id, reason, businessDate }: { id: number; businessDate: string; reason?: string }) =>
            noShowReservation(id, businessDate, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reception'] });
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
        },
    });

    return {
        checkIn,
        checkOut,
        confirm,
        cancel,
        noShow,
        parse,
    };
};
