import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminListings, createAdminListing, updateAdminListing } from '@/api/admin';
import type { CreateBranchListingCommand, UpdateBranchListingCommand } from '@/api/admin';

export const useAdminListings = (includeInactive: boolean = false) => {
    return useQuery({
        queryKey: ['admin-listings', includeInactive],
        queryFn: () => getAdminListings(includeInactive),
    });
};

export const useCreateListing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (command: CreateBranchListingCommand) => createAdminListing(command),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
        },
    });
};

export const useUpdateListing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (command: UpdateBranchListingCommand) => updateAdminListing(command),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
        },
    });
};
