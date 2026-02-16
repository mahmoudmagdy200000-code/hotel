import React, { createContext, useContext, useState, useEffect } from 'react';

interface BusinessDateContextType {
    businessDate: string; // yyyy-MM-dd
    setBusinessDate: (date: string) => void;
}

const BusinessDateContext = createContext<BusinessDateContextType | undefined>(undefined);

export const BusinessDateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initial value from local storage or today's date
    const [businessDate, setBusinessDate] = useState<string>(() => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const localToday = new Date(today.getTime() - (offset * 60 * 1000));
        const todayStr = localToday.toISOString().split('T')[0];

        const saved = localStorage.getItem('businessDate');
        // If saved date is older than today, reset to today
        if (saved && saved >= todayStr) return saved;

        return todayStr;
    });

    useEffect(() => {
        localStorage.setItem('businessDate', businessDate);
    }, [businessDate]);

    return (
        <BusinessDateContext.Provider value={{ businessDate, setBusinessDate }}>
            {children}
        </BusinessDateContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBusinessDate = () => {
    const context = useContext(BusinessDateContext);
    if (!context) {
        throw new Error('useBusinessDate must be used within a BusinessDateProvider');
    }
    return context;
};
