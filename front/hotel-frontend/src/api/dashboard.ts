/**
 * Dashboard API functions
 * Endpoints: GET /api/dashboard, GET /api/occupancy, GET /api/financials/revenue
 */

import http from './http';
import type {
    GetDashboardParams,
    DashboardDto,
    GetOccupancyParams,
    OccupancySummaryDto,
    GetRevenueSummaryParams,
    RevenueSummaryDto,
    GetDailyCashFlowParams,
    DailyCashFlowDto,
} from './types/dashboard';

/**
 * Get daily cash flow (Cashier Mode) summary.
 * OpenAPI: GET /api/dashboard/cash-flow
 */
export const getDailyCashFlow = async (params: GetDailyCashFlowParams = {}): Promise<DailyCashFlowDto> => {
    const response = await http.get<DailyCashFlowDto>('dashboard/cash-flow', { params });
    return response.data;
};

/**
 * Get dashboard summary with KPIs, daily series, and optional room type breakdown.
 * OpenAPI: GET /api/dashboard
 */
export const getDashboard = async (params: GetDashboardParams = {}): Promise<DashboardDto> => {
    const response = await http.get<DashboardDto>('dashboard', { params });
    return response.data;
};

/**
 * Get occupancy summary with daily and room-type breakdowns.
 * OpenAPI: GET /api/occupancy
 */
export const getOccupancy = async (params: GetOccupancyParams = {}): Promise<OccupancySummaryDto> => {
    const response = await http.get<OccupancySummaryDto>('occupancy', { params });
    return response.data;
};

/**
 * Get revenue summary for a date range.
 * OpenAPI: GET /api/financials/revenue
 */
export const getRevenueSummary = async (params: GetRevenueSummaryParams = {}): Promise<RevenueSummaryDto> => {
    const response = await http.get<RevenueSummaryDto>('financials/revenue', { params });
    return response.data;
};
