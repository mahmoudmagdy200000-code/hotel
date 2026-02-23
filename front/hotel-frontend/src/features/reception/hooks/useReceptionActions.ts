import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    checkInReservation,
    checkOutReservation,
    confirmReservation,
    cancelReservation,
    noShowReservation,
    parsePendingRequest
} from '@/api/reception';
import type { PaymentMethodValue } from '@/api/types/reservations';


export const useReceptionActions = () => {
    const queryClient = useQueryClient();

    const parse = useMutation({
        mutationFn: (id: number) => parsePendingRequest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
        },
    });

    const checkIn = useMutation({
        mutationFn: ({ id, businessDate, guestName, phone, bookingNumber, checkInDate, checkOutDate, totalAmount, balanceDue, paymentMethod, currencyCode, roomAssignments }: {
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
            currencyCode?: number;
            roomAssignments?: Array<{ lineId: number; roomId: number }>;
        }) =>
            checkInReservation(id, businessDate, guestName, phone, bookingNumber, checkInDate, checkOutDate, totalAmount, balanceDue, paymentMethod, currencyCode, roomAssignments),
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
