import { describe, it, expect } from 'vitest';
import {
    dashboardQueryKeys,
    occupancyQueryKeys,
    revenueSummaryQueryKeys
} from '../index';

describe('Dashboard Hooks Query Keys', () => {
    it('dashboardQueryKeys should include all params', () => {
        const params = { from: '2026-01-01', to: '2026-01-07', mode: 'Forecast' as const };
        expect(dashboardQueryKeys.list(params)).toEqual(['dashboard', params]);
    });

    it('occupancyQueryKeys should include all params', () => {
        const params = { from: '2026-01-01', to: '2026-01-14', mode: 'Forecast' as const, groupBy: 'day' as const };
        expect(occupancyQueryKeys.list(params)).toEqual(['occupancy', params]);
    });

    it('revenueSummaryQueryKeys should include all params', () => {
        const params = { from: '2026-01-01', to: '2026-01-31', mode: 'actual' as const, groupBy: 'roomType' as const };
        expect(revenueSummaryQueryKeys.list(params)).toEqual(['revenueSummary', params]);
    });
});
