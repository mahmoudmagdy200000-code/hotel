import { describe, it, expect } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import Occupancy from '../../Occupancy';

describe('Occupancy Page Smoke Tests', () => {
    it('renders occupancy rows and handles overbooked status', async () => {
        renderWithProviders(<Occupancy />);

        await waitFor(() => {
            const body = document.body.textContent || '';
            expect(body).toContain('2026-01-28');
            expect(body).toContain('95.0%');
            expect(body).toContain('Overbooked');
        }, { timeout: 10000 });
    });
});
