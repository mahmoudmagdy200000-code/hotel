/**
 * Financials Page - FE-7
 * Displays revenue summary for a date range with daily or room-type breakdown
 * Data from: GET /api/financials/revenue
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';
import { format, startOfMonth, endOfMonth, parseISO, addMonths, subMonths, setMonth, setYear } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DollarSign,
    CalendarDays,
    Building2,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Bed,
    Building,
} from 'lucide-react';
import { useRevenueSummary } from '@/hooks/dashboard';
import { formatCurrency } from '@/lib/utils';
import { CurrencyCodeEnum, CurrencyCodeLabels } from '@/api/types/reservations';
import type { GetRevenueSummaryParams, RevenueSummaryItemDto } from '@/api/types/dashboard';

const formatYYYYMMDD = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
};

const Financials = () => {
    const { t, i18n } = useTranslation();
    const { businessDate } = useBusinessDate();
    const dateLocale = i18n.language === 'ar' ? ar : enUS;

    // Use a single date to represent the currently viewed month
    const [currentDate, setCurrentDate] = useState<Date>(() => parseISO(businessDate));

    // Calculate start and end of the month
    const fromDate = startOfMonth(currentDate);
    const toDate = endOfMonth(currentDate);

    const formattedFrom = formatYYYYMMDD(fromDate);
    const formattedTo = formatYYYYMMDD(toDate);

    const [mode, setMode] = useState<'forecast' | 'actual'>('actual');
    const [groupBy, setGroupBy] = useState<'day' | 'roomType' | 'room' | 'branch' | 'hotel'>('day');
    const [selectedCurrency, setSelectedCurrency] = useState<number>(() => {
        const saved = localStorage.getItem('pms.currency');
        return saved ? parseInt(saved, 10) : CurrencyCodeEnum.EGP;
    });

    const handleCurrencyChange = (val: number) => {
        setSelectedCurrency(val);
        localStorage.setItem('pms.currency', val.toString());
    };

    const params: GetRevenueSummaryParams = useMemo(() => ({
        from: formattedFrom,
        to: formattedTo,
        mode,
        groupBy,
        currency: selectedCurrency,
    }), [formattedFrom, formattedTo, mode, groupBy, selectedCurrency]);

    const { data, isLoading, isError, error, refetch, isFetching } = useRevenueSummary(params);

    const handlePrevMonth = () => {
        setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(prev => addMonths(prev, 1));
    };

    const handleMonthSelect = (monthStr: string) => {
        const monthIndex = parseInt(monthStr);
        setCurrentDate(prev => setMonth(prev, monthIndex));
    };

    const handleYearSelect = (yearStr: string) => {
        const year = parseInt(yearStr);
        setCurrentDate(prev => setYear(prev, year));
    };

    const handleThisMonth = () => {
        setCurrentDate(new Date());
    };

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(2000, i, 1), 'MMMM', { locale: dateLocale })
    }));

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => (currentYear - 2 + i).toString());

    // Calculate max revenue for visual bar
    const maxRevenue = useMemo(() => {
        if (!data?.items || data.items.length === 0) return 0;
        return Math.max(...data.items.map(item => item.revenue));
    }, [data]);

    // Format date label for display
    const formatLabel = (key: string) => {
        if (groupBy === 'day') {
            const date = new Date(key);
            const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
            return `${key} (${dayName})`;
        }
        if (groupBy === 'roomType') {
            return key;
        }
        if (groupBy === 'room') {
            return `${t('financials.room')} ${key}`;
        }
        if (groupBy === 'branch') {
            return key;
        }
        if (groupBy === 'hotel') {
            return key;
        }
        return key;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-slate-800">
                        {t('financials.title')}
                    </h1>

                    <div className="text-sm text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-md border border-slate-200">
                        {formattedFrom} <span className="text-slate-300 mx-2">→</span> {formattedTo}
                    </div>
                </div>

                {/* Unified Toolbar */}
                <div className="flex flex-col xl:flex-row gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm items-start xl:items-center justify-between">

                    {/* Left: Date Navigation */}
                    <div className="flex items-center gap-1 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 hide-scrollbar">
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrevMonth}
                                disabled={isFetching}
                                className="h-8 w-8 hover:bg-white hover:shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>

                            <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthSelect}>
                                <SelectTrigger className="w-[110px] h-8 border-none shadow-none focus:ring-0 bg-transparent font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearSelect}>
                                <SelectTrigger className="w-[80px] h-8 border-none shadow-none focus:ring-0 bg-transparent font-medium text-slate-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleNextMonth}
                                disabled={isFetching}
                                className="h-8 w-8 hover:bg-white hover:shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleThisMonth}
                            disabled={isFetching}
                            className="h-10 ml-2 border-slate-200 hover:bg-slate-50 hover:text-emerald-600"
                        >
                            <CalendarDays className="w-4 h-4 me-2" />
                            {t('common.today', 'Today')}
                        </Button>
                    </div>

                    {/* Right: View Settings */}
                    <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">

                        {/* Mode Toggle */}
                        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                            <button
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'forecast'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                onClick={() => setMode('forecast')}
                            >
                                {t('dashboard.forecast')}
                            </button>
                            <button
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${mode === 'actual'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                onClick={() => setMode('actual')}
                            >
                                {t('dashboard.actual')}
                            </button>
                        </div>

                        {/* Currency */}
                        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
                            {Object.entries(CurrencyCodeLabels).map(([code, label]) => (
                                <button
                                    key={code}
                                    className={`px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${selectedCurrency === parseInt(code, 10)
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    onClick={() => handleCurrencyChange(parseInt(code, 10))}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-10 w-10 shrink-0 border-slate-200"
                            title={t('common.retry')}
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Date Range Display */}
            <div className="text-sm text-slate-500">
                {formattedFrom} → {formattedTo}
            </div>

            {/* Error State */}
            {isError && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="py-6">
                        <div className="flex items-center gap-3 text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <span>{t('common.error_loading')}: {(error as Error)?.message || 'Unknown error'}</span>
                            <Button variant="outline" size="sm" onClick={() => refetch()}>
                                {t('common.retry')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Total Revenue Card */}
            <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-32 bg-emerald-400/50" />
                            <Skeleton className="h-10 w-48 bg-emerald-400/50" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 text-emerald-100 mb-2">
                                <DollarSign className="w-5 h-5" />
                                <span className="text-sm font-medium">{t('financials.total_revenue')}</span>
                            </div>
                            <div className="text-4xl font-bold">
                                {data ? formatCurrency(data.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]) : '—'}
                            </div>
                            <div className="text-sm text-emerald-100 mt-2">
                                {mode === 'forecast' ? t('financials.forecast_note') : t('financials.actual_note')}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Group By Toggle */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">{t('financials.group_by')}:</span>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    <button
                        className={`px-4 py-2 text-sm transition-colors flex items-center gap-2 ${groupBy === 'day'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        onClick={() => setGroupBy('day')}
                    >
                        <CalendarDays className="w-4 h-4" />
                        {t('financials.by_day')}
                    </button>
                    <button
                        className={`px-4 py-2 text-sm transition-colors flex items-center gap-2 ${groupBy === 'roomType'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        onClick={() => setGroupBy('roomType')}
                    >
                        <Building2 className="w-4 h-4" />
                        {t('financials.by_room_type')}
                    </button>
                    <button
                        className={`px-4 py-2 text-sm transition-colors flex items-center gap-2 ${groupBy === 'room'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        onClick={() => setGroupBy('room')}
                    >
                        <Bed className="w-4 h-4" />
                        {t('financials.by_room')}
                    </button>
                    <button
                        className={`px-4 py-2 text-sm transition-colors flex items-center gap-2 ${groupBy === 'branch'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-s border-slate-200'
                            }`}
                        onClick={() => setGroupBy('branch')}
                    >
                        <Building2 className="w-4 h-4" />
                        {t('financials.by_branch')}
                    </button>
                    <button
                        className={`px-4 py-2 text-sm transition-colors flex items-center gap-2 ${groupBy === 'hotel'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border-s border-slate-200'
                            }`}
                        onClick={() => setGroupBy('hotel')}
                    >
                        <Building className="w-4 h-4" />
                        {t('financials.by_hotel', 'By Hotel')}
                    </button>
                </div>
            </div>

            {/* Revenue Breakdown */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                        {groupBy === 'day'
                            ? t('financials.daily_revenue')
                            : groupBy === 'roomType'
                                ? t('financials.revenue_by_room_type')
                                : groupBy === 'room'
                                    ? t('financials.revenue_by_room')
                                    : groupBy === 'branch'
                                        ? t('financials.revenue_by_branch')
                                        : t('financials.revenue_by_hotel', 'Revenue by Hotel')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : data?.items && data.items.length > 0 ? (
                        <div className="space-y-3">
                            {data.items.map((item: RevenueSummaryItemDto) => (
                                <div key={item.key} className="flex items-center gap-4">
                                    <div className="w-32 sm:w-48 text-sm text-slate-700 truncate">
                                        {formatLabel(item.key)}
                                    </div>
                                    <div className="flex-1 relative">
                                        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-lg transition-all duration-500"
                                                style={{
                                                    width: maxRevenue > 0 ? `${(item.revenue / maxRevenue) * 100}%` : '0%'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-28 text-right font-medium text-slate-900">
                                        {item.revenue !== null && item.revenue !== undefined ? formatCurrency(item.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]) : '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-slate-400">
                            {t('financials.no_data_for_range')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Summary Table */}
            {data?.items && data.items.length > 0 && (
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-800">
                            {t('financials.detailed_breakdown')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 font-medium text-slate-600">
                                            {groupBy === 'day'
                                                ? t('financials.date')
                                                : groupBy === 'roomType'
                                                    ? t('financials.room_type')
                                                    : groupBy === 'room'
                                                        ? t('financials.room')
                                                        : groupBy === 'branch'
                                                            ? t('financials.branch')
                                                            : t('financials.hotel', 'Hotel')}
                                        </th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('financials.revenue')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('financials.share')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.items.map((item: RevenueSummaryItemDto) => {
                                        // CLIENT_CALCULATED_OK - Revenue share is for visualization only
                                        const share = data.totalRevenue > 0
                                            ? ((item.revenue / data.totalRevenue) * 100).toFixed(1)
                                            : '0.0';
                                        return (
                                            <tr key={item.key} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 font-medium text-slate-900">
                                                    {formatLabel(item.key)}
                                                </td>
                                                <td className="py-3 px-4 text-right text-slate-700">
                                                    {formatCurrency(item.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                </td>
                                                <td className="py-3 px-4 text-right text-slate-500">
                                                    {share}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                                        <td className="py-3 px-4 font-bold text-slate-900">{t('financials.total')}</td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900">
                                            {formatCurrency(data.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-500">100%</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Financials;
