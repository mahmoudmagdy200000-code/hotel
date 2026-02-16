import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser, createUser } from '@/api/auth';
import { getBranches } from '@/api/branches';
import type { UpdateUserCommand, CreateUserCommand } from '@/api/types/auth';

export const useUsers = () => {
    return useQuery({
        queryKey: ['users'],
        queryFn: () => getUsers().then(res => res.data),
    });
};

export const useBranches = () => {
    return useQuery({
        queryKey: ['branches'],
        queryFn: () => getBranches(),
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (command: UpdateUserCommand) => updateUser(command),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (command: CreateUserCommand) => createUser(command),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
};
