/**
 * Dashboard API Types
 * Based on OpenAPI: GET /api/dashboard, GET /api/occupancy, GET /api/financials/revenue
 */

// ============================================================================
// Dashboard Endpoint Types (GET /api/dashboard)
// ============================================================================

export interface GetDashboardParams {
    from?: string; // ISO date string
    to?: string;   // ISO date string (exclusive end)
    mode?: 'Forecast' | 'Actual';
    includeRoomTypeBreakdown?: boolean;
    currency?: number;
}

export interface DashboardDto {
    summary: DashboardKpiSummaryDto;
    byDay: DashboardSeriesPointDto[];
    byRoomType?: DashboardRoomTypeKpiDto[] | null;
}

export interface DashboardKpiSummaryDto {
    from: string;
    to: string;
    nightsCount: number;
    mode: string;
    totalRooms: number;
    supplyRoomNights: number;
    soldRoomNights: number;
    occupancyRateOverall: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    adr: number;
    revPar: number;
}

export interface DashboardSeriesPointDto {
    date: string; // yyyy-MM-dd
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    revenue: number;
    expenses: number;
    netProfit: number;
    adr: number;
    revPar: number;
}

export interface DashboardRoomTypeKpiDto {
    roomTypeId: number;
    roomTypeName?: string | null;
    soldRoomNights: number;
    revenue: number;
    adr: number;
    occupancyRate?: number | null;
}

// ============================================================================
// Occupancy Endpoint Types (GET /api/occupancy)
// ============================================================================

export interface GetOccupancyParams {
    from?: string;
    to?: string;
    mode?: 'Forecast' | 'Actual';
    groupBy?: 'day' | 'roomType' | 'both';
}

export interface OccupancySummaryDto {
    from: string;
    to: string;
    nightsCount: number;
    mode: string;
    totalRooms: number;
    supplyRoomNights: number;
    soldRoomNights: number;
    occupancyRateOverall: number;
    byDay: OccupancyDayDto[];
    byRoomTypeByDay: OccupancyByRoomTypeDayDto[];
}

export interface OccupancyDayDto {
    date: string; // yyyy-MM-dd
    totalRooms: number;
    occupiedRooms: number;
    occupancyRate: number;
    roomNightsSold: number;
    availableRooms: number;
    overbooked: boolean;
}

export interface OccupancyByRoomTypeDayDto {
    date: string;
    roomTypeId: number;
    roomTypeName?: string | null;
    occupiedRoomsOfType: number;
    roomNightsSoldOfType: number;
}

// ============================================================================
// Revenue/Financials Endpoint Types (GET /api/financials/revenue)
// ============================================================================

export interface GetRevenueSummaryParams {
    from?: string;
    to?: string;
    mode?: 'forecast' | 'actual';
    groupBy?: 'day' | 'roomType' | 'room' | 'branch' | 'hotel';
    currency?: number;
}

export interface RevenueSummaryDto {
    totalRevenue: number;
    items: RevenueSummaryItemDto[];
}

export interface RevenueSummaryItemDto {
    key: string; // Date (yyyy-MM-dd) or RoomType Name
    revenue: number;
}
