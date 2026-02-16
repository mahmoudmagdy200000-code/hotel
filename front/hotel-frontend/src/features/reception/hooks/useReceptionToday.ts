import { useQuery } from '@tanstack/react-query';
import { getReceptionToday } from '@/api/reception';
import { isValidYYYYMMDD } from '@/lib/utils';
import type { ReceptionTodayDto } from '@/api/types/reception';

export const useReceptionToday = (date: string) => {
    return useQuery<ReceptionTodayDto>({
        queryKey: ['reception', 'today', date],
        queryFn: () => getReceptionToday(date),
        enabled: isValidYYYYMMDD(date),
    });
};
