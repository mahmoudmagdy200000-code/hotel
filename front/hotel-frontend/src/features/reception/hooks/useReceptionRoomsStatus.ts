import { useQuery } from '@tanstack/react-query';
import { getReceptionRoomsStatus } from '@/api/reception';
import { isValidYYYYMMDD } from '@/lib/utils';
import type { ReceptionRoomsStatusDto } from '@/api/types/reception';

export const useReceptionRoomsStatus = (date: string) => {
    return useQuery<ReceptionRoomsStatusDto>({
        queryKey: ['reception', 'rooms-status', date],
        queryFn: () => getReceptionRoomsStatus(date),
        enabled: isValidYYYYMMDD(date),
    });
};
