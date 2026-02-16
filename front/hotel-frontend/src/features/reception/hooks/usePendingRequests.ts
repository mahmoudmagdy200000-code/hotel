import { useQuery } from '@tanstack/react-query';
import { getPendingRequests } from '@/api/reception';
import { isValidYYYYMMDD } from '@/lib/utils';
import type { PendingRequestsDto } from '@/api/types/reception';

export const usePendingRequests = (from: string, to: string, limit: number = 50, enabled: boolean = true) => {
    // Robust validation for the query execution
    const isDateValid = isValidYYYYMMDD(from) && isValidYYYYMMDD(to);
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const isRangeValid = isDateValid && toDate > fromDate;
    const dateDiffDays = isRangeValid ? (toDate.getTime() - fromDate.getTime()) / (1000 * 3600 * 24) : 0;
    const isWithinLimit = dateDiffDays <= 90;

    return useQuery<PendingRequestsDto>({
        queryKey: ['pendingRequests', { from, to, limit }],
        queryFn: () => getPendingRequests({ from, to, limit }),
        enabled: enabled && isRangeValid && isWithinLimit,
    });
};
