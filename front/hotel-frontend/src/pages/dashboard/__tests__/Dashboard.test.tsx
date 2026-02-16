import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import Dashboard from '../../Dashboard';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/msw/server';
import { normalDashboard, zeroDashboard } from '@/tests/msw/handlers/dashboard.handlers';

describe('Dashboard Page Smoke Tests', () => {
    it('renders KPI cards with data from backend', async () => {
        renderWithProviders(<Dashboard />);

        // Use a more reliable way to find the data
        await waitFor(() => {
            const body = document.body.textContent || '';
            expect(body).toContain('100');
            expect(body).toContain('350');
            expect(body).toContain('50.0%');
            expect(body).toContain('35,000');
        }, { timeout: 10000 });
    });

    it('triggers refetch when mode is changed', async () => {
        const handler = vi.fn(() => HttpResponse.json(normalDashboard));
        server.use(http.get(/dashboard/, () => {
            console.log("TEST HANDLER CALLED");
            return handler();
        }));

        renderWithProviders(<Dashboard />);

        await waitFor(() => {
            expect(document.body.textContent).toContain('100');
        }, { timeout: 10000 });

        // Use role-based selector to avoid matching tooltip text
        const actualButton = screen.getByRole('button', { name: /Actual \(Realized\)/i });
        fireEvent.click(actualButton);

        await waitFor(() => expect(handler).toHaveBeenCalledTimes(2), { timeout: 10000 });
    });

    it('renders 0 for zero values', async () => {
        server.use(http.get(/dashboard/, () => HttpResponse.json(zeroDashboard)));

        renderWithProviders(<Dashboard />);

        await waitFor(() => {
            expect(document.body.textContent).toContain('0');
        }, { timeout: 10000 });
    });
});
