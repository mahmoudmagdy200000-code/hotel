import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { BusinessDateProvider } from '@/app/providers/BusinessDateProvider';
import { MemoryRouter } from 'react-router-dom';

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            staleTime: 0,
            gcTime: 0,
        },
    },
});

export function renderWithProviders(ui: React.ReactElement) {
    const queryClient = createTestQueryClient();

    // Force English and clear storage to avoid leaked state
    localStorage.clear();
    i18n.changeLanguage('en');

    return render(
        <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18n}>
                <BusinessDateProvider>
                    <MemoryRouter>
                        {ui}
                    </MemoryRouter>
                </BusinessDateProvider>
            </I18nextProvider>
        </QueryClientProvider>
    );
}
