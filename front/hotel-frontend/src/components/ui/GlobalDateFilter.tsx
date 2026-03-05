import React from 'react';
import { useGlobalDateFilter } from '@/app/providers/GlobalDateProvider';
import { DatePicker } from '@/components/ui/date-picker';
import { parseISO, format, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';

/**
 * A reusable, presentational component that connects to the GlobalDateContext.
 * Use this in headers or toolbars across Nexa PMS to control the session-persistent date.
 */
export const GlobalDateFilter: React.FC = () => {
    const { globalDate, setGlobalDate } = useGlobalDateFilter();
    const { t } = useTranslation();

    const isDateValid = isValid(parseISO(globalDate));

    return (
        <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-xs font-bold text-slate-500 uppercase tracking-widest">
                {t('filter_date', 'Date')}:
            </span>
            <DatePicker
                date={isDateValid ? parseISO(globalDate) : undefined}
                setDate={(d) => {
                    if (d) {
                        setGlobalDate(format(d, 'yyyy-MM-dd'));
                    }
                }}
                className="w-[180px] h-9 text-xs font-bold border-slate-200 shadow-sm transition-all hover:bg-slate-50"
            />
        </div>
    );
};
