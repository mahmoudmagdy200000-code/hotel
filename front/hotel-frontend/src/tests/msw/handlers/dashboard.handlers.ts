import { http, HttpResponse } from 'msw';
import type {
    DashboardDto,
    OccupancySummaryDto,
    RevenueSummaryDto
} from '@/api/types/dashboard';

// Fixtures
export const normalDashboard: DashboardDto = {
    summary: {
        from: '2026-01-25',
        to: '2026-01-26',
        nightsCount: 1,
        mode: 'Actual',
        totalRooms: 10,
        supplyRoomNights: 10,
        soldRoomNights: 5,
        occupancyRateOverall: 50,
        totalRevenue: 500,
        adr: 100,
        revPar: 50
    },
    byDay: [
        {
            date: '2026-01-25',
            totalRooms: 10,
            occupiedRooms: 5,
            occupancyRate: 50,
            revenue: 500,
            adr: 100,
            revPar: 50
        }
    ]
};

export const zeroDashboard: DashboardDto = {
    summary: {
        from: '2026-01-25',
        to: '2026-01-26',
        nightsCount: 1,
        mode: 'Actual',
        totalRooms: 10,
        supplyRoomNights: 10,
        soldRoomNights: 0,
        occupancyRateOverall: 0,
        totalRevenue: 0,
        adr: 0,
        revPar: 0
    },
    byDay: [
        {
            date: '2026-01-25',
            totalRooms: 10,
            occupiedRooms: 0,
            occupancyRate: 0,
            revenue: 0,
            adr: 0,
            revPar: 0
        }
    ]
};

export const normalOccupancy: OccupancySummaryDto = {
    from: '2026-01-25',
    to: '2026-01-26',
    nightsCount: 1,
    mode: 'Actual',
    totalRooms: 10,
    supplyRoomNights: 10,
    soldRoomNights: 5,
    occupancyRateOverall: 50,
    byDay: [
        {
            date: '2026-01-25',
            totalRooms: 10,
            occupiedRooms: 5,
            occupancyRate: 50,
            roomNightsSold: 5,
            availableRooms: 5,
            overbooked: false
        }
    ],
    byRoomTypeByDay: []
};

export const normalFinancials: RevenueSummaryDto = {
    totalRevenue: 500,
    items: [
        { key: '2026-01-25', revenue: 500 }
    ]
};

export const handlers = [
    http.get(/dashboard/, () => {
        return HttpResponse.json(normalDashboard);
    }),
    http.get(/occupancy/, () => {
        return HttpResponse.json(normalOccupancy);
    }),
    http.get(/financials\/revenue/, () => {
        return HttpResponse.json(normalFinancials);
    }),
];
