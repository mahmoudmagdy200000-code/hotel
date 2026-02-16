import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType } from '@/api/rooms';
import type { UpdateRoomTypeCommand } from '@/api/types/rooms';

export const useRoomTypes = () => {
    return useQuery({
        queryKey: ['room-types'],
        queryFn: getRoomTypes,
    });
};

export const useRoomTypeActions = () => {
    const queryClient = useQueryClient();

    const createEffect = useMutation({
        mutationFn: createRoomType,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room-types'] }),
    });

    const updateEffect = useMutation({
        mutationFn: ({ id, command }: { id: number; command: UpdateRoomTypeCommand }) => updateRoomType(id, command),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room-types'] }),
    });

    const deleteEffect = useMutation({
        mutationFn: deleteRoomType,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['room-types'] }),
    });

    return {
        create: createEffect,
        update: updateEffect,
        delete: deleteEffect,
    };
};
