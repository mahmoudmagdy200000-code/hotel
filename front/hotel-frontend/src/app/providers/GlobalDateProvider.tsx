import React, { createContext, useContext, useState } from 'react';
import { format, parseISO, isValid } from 'date-fns';

export interface GlobalDateContextType {
    globalDate: string; // ISO yyyy-MM-dd
    setGlobalDate: (date: string) => void;
}

const GlobalDateContext = createContext<GlobalDateContextType | null>(null);

const STORAGE_KEY = 'nexa_global_date_filter';

export const GlobalDateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize from sessionStorage or default to today's date
    const [globalDate, setGlobalDateState] = useState<string>(() => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored && isValid(parseISO(stored))) {
                return stored;
            }
        } catch {
            // Ignore storage errors on init
        }
        return format(new Date(), 'yyyy-MM-dd');
    });

    // Sync back to sessionStorage when it changes
    const setGlobalDate = (newDate: string) => {
        if (isValid(parseISO(newDate))) {
            setGlobalDateState(newDate);
            try {
                sessionStorage.setItem(STORAGE_KEY, newDate);
            } catch {
                // Ignore Safari private-mode quotas or generic storage failures natively
            }
        }
    };

    return (
        <GlobalDateContext.Provider value={{ globalDate, setGlobalDate }}>
            {children}
        </GlobalDateContext.Provider>
    );
};

/**
 * Custom hook to consume the global date filter.
 * Ensures usage strictly within the provider.
 */
export const useGlobalDateFilter = (): GlobalDateContextType => {
    const context = useContext(GlobalDateContext);
    if (!context) {
        throw new Error('useGlobalDateFilter must be used within a GlobalDateProvider');
    }
    return context;
};
