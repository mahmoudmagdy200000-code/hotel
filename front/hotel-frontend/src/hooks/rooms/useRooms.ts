import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRooms, createRoom, updateRoom, deleteRoom } from '@/api/rooms';
import type { UpdateRoomCommand } from '@/api/types/rooms';

export const useRooms = () => {
    return useQuery({
        queryKey: ['rooms'],
        queryFn: () => getRooms(),
    });
};

export const useRoomActions = () => {
    const queryClient = useQueryClient();

    const createEffect = useMutation({
        mutationFn: createRoom,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
    });

    const updateEffect = useMutation({
        mutationFn: ({ id, command }: { id: number; command: UpdateRoomCommand }) => updateRoom(id, command),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
    });

    const deleteEffect = useMutation({
        mutationFn: deleteRoom,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rooms'] }),
    });

    return {
        create: createEffect,
        update: updateEffect,
        delete: deleteEffect,
    };
};
