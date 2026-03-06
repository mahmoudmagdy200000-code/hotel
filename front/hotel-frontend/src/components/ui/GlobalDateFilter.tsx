import React from 'react';
import { ResponsiveDatePicker } from '@/components/ui/responsive-date-picker';
import { useTranslation } from 'react-i18next';

/**
 * A reusable, presentational component that connects to the GlobalDateContext / URL Search Params.
 * Use this in headers or toolbars across Nexa PMS to control the session-persistent date.
 */
export const GlobalDateFilter: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs font-bold text-slate-500 uppercase tracking-widest">
                {t('filter_date', 'Date')}:
            </span>
            <ResponsiveDatePicker />
        </div>
    );
};
