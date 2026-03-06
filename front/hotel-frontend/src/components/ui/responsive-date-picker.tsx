import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useDateFilter, DateFilterRange } from '@/hooks/useDateFilter';
import { Calendar } from './calendar';
import { format, parseISO } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ar, enUS } from 'date-fns/locale';

export const ResponsiveDatePicker: React.FC = () => {
    const isDesktop = useMediaQuery('(min-width: 768px)');
    const { dateRange, setDateFilter } = useDateFilter();
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'ar' ? ar : enUS;

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Local state segregates ephemeral user selection from the global URL context.
    const [localRange, setLocalRange] = useState<DateRange | undefined>(() => {
        return {
            from: dateRange.startDate ? parseISO(dateRange.startDate) : undefined,
            to: dateRange.endDate ? parseISO(dateRange.endDate) : undefined,
        }
    });

    // Synchronize local scope to global scope upon Drawer open.
    useEffect(() => {
        if (isOpen) {
            setLocalRange({
                from: dateRange.startDate ? parseISO(dateRange.startDate) : undefined,
                to: dateRange.endDate ? parseISO(dateRange.endDate) : undefined,
            });
        }
    }, [isOpen, dateRange]);

    // Ensure scroll locking is enforced only on Mobile Modal overlays.
    useEffect(() => {
        if (!isDesktop && isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, isDesktop]);

    // Enforce Desktop click-away closure.
    useEffect(() => {
        if (!isDesktop || !isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDesktop, isOpen]);

    const handleApply = () => {
        setDateFilter({
            startDate: localRange?.from ? format(localRange.from, 'yyyy-MM-dd') : null,
            endDate: localRange?.to ? format(localRange.to, 'yyyy-MM-dd') : null,
        });
        setIsOpen(false);
    };

    const handleCancel = () => {
        setLocalRange({
            from: dateRange.startDate ? parseISO(dateRange.startDate) : undefined,
            to: dateRange.endDate ? parseISO(dateRange.endDate) : undefined,
        });
        setIsOpen(false);
    };

    const handleDateSelection = (range: DateRange | undefined) => {
        setLocalRange(range);
        // On desktop, changes can apply instantaneously via smart popovers, whereas Mobile 
        // requires definitive `Apply` execution due to the drawer UX paradigm.
        if (isDesktop && range?.from && range?.to) {
            setDateFilter({
                startDate: format(range.from, 'yyyy-MM-dd'),
                endDate: format(range.to, 'yyyy-MM-dd'),
            });
            setIsOpen(false);
        }
    };

    const displayText = dateRange.startDate
        ? `${dateRange.startDate} ${dateRange.endDate ? `— ${dateRange.endDate}` : ''}`
        : t('filter_date', 'Select Date Range');

    // DRY Principle: Declare internal component graph reference once.
    const CalendarNode = (
        <Calendar
            mode="range"
            selected={localRange}
            onSelect={handleDateSelection}
            defaultMonth={localRange?.from}
            numberOfMonths={isDesktop ? 2 : 1}
            locale={locale}
            className="p-4"
        />
    );

    return (
        <div className="relative inline-block w-full md:w-auto" ref={popoverRef}>

            {/* Target Action - Requires 44x44px min touch area */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex items-center justify-between w-full md:w-64 min-h-[44px] px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <div className="flex items-center">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{displayText}</span>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </button>

            {/* Desktop Perspective Popover */}
            {isOpen && isDesktop && (
                <div className="absolute left-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl top-full" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    {CalendarNode}
                </div>
            )}

            {/* Mobile Perspective Bottom Drawer via Global Portal Target */}
            {isOpen && !isDesktop && createPortal(
                <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/50 backdrop-blur-sm transition-opacity" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                    {/* Underlay Clicker */}
                    <div className="absolute inset-0" onClick={handleCancel} aria-hidden="true" />

                    <div className="relative w-full bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Grab Handle Header */}
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                            {CalendarNode}
                        </div>

                        {/* Static Interactive Footer */}
                        <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-4 sticky bottom-0">
                            <button
                                onClick={handleCancel}
                                className="w-full min-h-[44px] px-4 py-2 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
                                type="button"
                            >
                                {t('cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleApply}
                                className="w-full min-h-[44px] px-4 py-2 text-white bg-blue-600 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                disabled={!localRange?.from}
                                type="button"
                            >
                                {t('confirm', 'Apply')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
