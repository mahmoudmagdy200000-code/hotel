import { useMemo } from 'react';
import { ReservationStatus } from '@/api/types/reservations';
import type { ReservationDto } from '@/api/types/reservations';
import { isSameDay, parseISO, addDays } from 'date-fns';

export type QuickFilterType = 'all' | 'arrivals' | 'departures' | 'in-house' | 'action-required';

interface UseReservationFiltersProps {
    reservations: ReservationDto[] | undefined;
    quickFilter: QuickFilterType;
    businessDate: string;
}

export const useReservationFilters = ({
    reservations,
    quickFilter,
    businessDate
}: UseReservationFiltersProps) => {
    const bDate = parseISO(businessDate);
    const upcomingThreshold = addDays(bDate, 3); // Action required if arrival within 3 days

    const filteredAndSortedReservations = useMemo(() => {
        if (!reservations) return [];

        let filtered = [...reservations];

        // 1. Apply Quick Filters
        if (quickFilter !== 'all') {
            filtered = filtered.filter(res => {
                const arrivalDate = parseISO(res.checkInDate);
                const departureDate = parseISO(res.checkOutDate);
                const isUnassigned = res.lines.some(l => !l.roomId || l.roomNumber?.toLowerCase().includes('unassigned'));

                switch (quickFilter) {
                    case 'arrivals':
                        return isSameDay(arrivalDate, bDate);
                    case 'departures':
                        return isSameDay(departureDate, bDate);
                    case 'in-house':
                        return res.status === ReservationStatus.CheckedIn;
                    case 'action-required':
                        const isDraft = res.status === ReservationStatus.Draft;
                        const needsAssignment = isUnassigned && arrivalDate <= upcomingThreshold && res.status !== ReservationStatus.Cancelled && res.status !== ReservationStatus.CheckedOut;
                        return isDraft || needsAssignment;
                    default:
                        return true;
                }
            });
        }

        // 2. Apply Action-Driven Sorting
        return filtered.sort((a, b) => {
            const aArrival = parseISO(a.checkInDate);
            const bArrival = parseISO(b.checkInDate);

            const aIsUnassigned = a.lines.some(l => !l.roomId || l.roomNumber?.toLowerCase().includes('unassigned'));
            const bIsUnassigned = b.lines.some(l => !l.roomId || l.roomNumber?.toLowerCase().includes('unassigned'));

            const aNeedsAction = a.status === ReservationStatus.Draft || (aIsUnassigned && aArrival <= upcomingThreshold && a.status !== ReservationStatus.Cancelled && a.status !== ReservationStatus.CheckedOut);
            const bNeedsAction = b.status === ReservationStatus.Draft || (bIsUnassigned && bArrival <= upcomingThreshold && b.status !== ReservationStatus.Cancelled && b.status !== ReservationStatus.CheckedOut);

            // Priority 1: Action Required
            if (aNeedsAction && !bNeedsAction) return -1;
            if (!aNeedsAction && bNeedsAction) return 1;

            // Priority 2: Chronological order (closest arrival first)
            if (aArrival.getTime() !== bArrival.getTime()) {
                return aArrival.getTime() - bArrival.getTime();
            }

            // Priority 3: Fallback to ID or status
            return a.id - b.id;
        });
    }, [reservations, quickFilter, bDate, upcomingThreshold]);

    return {
        filteredAndSortedReservations
    };
};
