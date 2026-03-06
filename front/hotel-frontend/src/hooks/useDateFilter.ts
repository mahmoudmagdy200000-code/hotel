import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';

export interface DateFilterRange {
    startDate: string | null;
    endDate: string | null;
}

/**
 * Standardizes URL-based Date Filtering persistence.
 * Best practice for shareable views in Dashboards and Reservations.
 */
export function useDateFilter() {
    const [searchParams, setSearchParams] = useSearchParams();

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const setDateFilter = useCallback((range: DateFilterRange) => {
        setSearchParams(
            (params) => {
                if (range.startDate) params.set('startDate', range.startDate);
                else params.delete('startDate');

                if (range.endDate) params.set('endDate', range.endDate);
                else params.delete('endDate');

                // Always reset pagination cursor securely if dates change to avoid empty data boundaries
                params.delete('page');

                return params;
            },
            { replace: true } // replace: true avoids flooding the browser router history stack with filter clicks 
        );
    }, [setSearchParams]);

    return {
        dateRange: { startDate, endDate },
        setDateFilter,
    };
}
