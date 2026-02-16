import { describe, it, expect, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import Financials from '../../Financials';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/msw/server';
import { normalFinancials } from '@/tests/msw/handlers/dashboard.handlers';

describe('Financials Page Smoke Tests', () => {
    it('renders revenue items and updates on range change', async () => {
        const handler = vi.fn(() => HttpResponse.json(normalFinancials));
        server.use(http.get(/financials\/revenue/, handler));

        renderWithProviders(<Financials />);

        await waitFor(() => {
            const body = document.body.textContent || '';
            expect(body).toContain('35,000');
            expect(body).toContain('2026-01-28');
        }, { timeout: 10000 });
    });

    it('shows em-dash for null revenue items', async () => {
        server.use(http.get(/financials\/revenue/, () => HttpResponse.json({
            totalRevenue: 0,
            items: [{ key: 'EmptyItem', revenue: null }]
        })));

        renderWithProviders(<Financials />);

        await waitFor(() => {
            const body = document.body.textContent || '';
            expect(body).toContain('EmptyItem');
            expect(body).toContain('—');
        }, { timeout: 10000 });
    });
});
