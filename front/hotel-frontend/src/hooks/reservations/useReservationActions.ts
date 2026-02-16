import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createReservation,
    updateReservation,
    confirmReservation,
    cancelReservation,
    deleteReservation
} from '@/api/reservations';
import { checkInReservation as receptionCheckIn, checkOutReservation as receptionCheckOut, noShowReservation as receptionNoShow } from '@/api/reception';
import type { CreateReservationCommand, UpdateReservationCommand } from '@/api/types/reservations';

export const useReservationActions = () => {
    const queryClient = useQueryClient();

    const invalidate = (id?: number) => {
        queryClient.invalidateQueries({ queryKey: ['reservations'] });
        if (id) {
            queryClient.invalidateQueries({ queryKey: ['reservation', id] });
        } else {
            queryClient.invalidateQueries({ queryKey: ['reservation'] });
        }
        queryClient.invalidateQueries({ queryKey: ['reception'] });
    };

    const create = useMutation({
        mutationFn: (command: CreateReservationCommand) => createReservation(command),
        onSuccess: () => invalidate(),
    });

    const update = useMutation({
        mutationFn: ({ id, command }: { id: number; command: UpdateReservationCommand }) =>
            updateReservation(id, command),
        onSuccess: (_, variables) => invalidate(variables.id),
    });

    const confirm = useMutation({
        mutationFn: (id: number) => confirmReservation(id),
        onSuccess: (_, id) => invalidate(id),
    });

    const checkIn = useMutation({
        mutationFn: ({ id, businessDate }: { id: number; businessDate: string }) =>
            receptionCheckIn(id, businessDate),
        onSuccess: (_, variables) => invalidate(variables.id),
    });

    const checkOut = useMutation({
        mutationFn: ({ id, businessDate }: { id: number; businessDate: string }) =>
            receptionCheckOut(id, businessDate),
        onSuccess: (_, variables) => invalidate(variables.id),
    });

    const noShow = useMutation({
        mutationFn: ({ id, businessDate, reason }: { id: number; businessDate: string; reason?: string }) =>
            receptionNoShow(id, businessDate, reason),
        onSuccess: (_, variables) => invalidate(variables.id),
    });

    const cancel = useMutation({
        mutationFn: (id: number) => cancelReservation(id),
        onSuccess: (_, id) => invalidate(id),
    });

    const remove = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason?: string }) => deleteReservation(id, reason),
        onSuccess: (_, variables) => {
            // Remove the specific query for this reservation so it doesn't refetch (and 404)
            queryClient.removeQueries({ queryKey: ['reservation', variables.id] });
            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: ['reservations'] });
            queryClient.invalidateQueries({ queryKey: ['reception'] });
        },
    });

    return {
        create,
        update,
        confirm,
        checkIn,
        checkOut,
        noShow,
        cancel,
        remove,
    };
};
