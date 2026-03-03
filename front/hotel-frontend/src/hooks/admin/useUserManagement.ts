import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, updateUser, createUser } from '@/api/auth';
import { getBranches, createBranch } from '@/api/branches';
import type { UpdateUserCommand, CreateUserCommand } from '@/api/types/auth';
import { useAuth } from '@/hooks/useAuth';

export const useUsers = () => {
    const { user } = useAuth();
    const isAdminOrOwner = user?.role === 'Administrator' || user?.role === 'Owner';

    return useQuery({
        queryKey: ['users'],
        queryFn: () => getUsers().then(res => res.data),
        enabled: isAdminOrOwner,
    });
};

export const useBranches = () => {
    const { user } = useAuth();
    const isAdminOrOwner = user?.role === 'Administrator' || user?.role === 'Owner';

    return useQuery({
        queryKey: ['branches'],
        queryFn: () => getBranches(),
        enabled: isAdminOrOwner,
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

export const useCreateBranch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (name: string) => createBranch(name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        },
    });
};

