/**
 * Occupancy Page - FE-7
 * Displays occupancy forecast/actual data with daily breakdown
 * Data from: GET /api/occupancy
 */

import { useState, useMemo, Fragment } from 'react';
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
    CalendarDays,
    TrendingUp,
    Building2,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
} from 'lucide-react';
import { useOccupancy } from '@/hooks/dashboard';
import type { GetOccupancyParams, OccupancyDayDto } from '@/api/types/dashboard';

const Occupancy = () => {
    const { t, i18n } = useTranslation();
    const { businessDate } = useBusinessDate();
    const dateLocale = i18n.language === 'ar' ? ar : enUS;

    // Use a single date to represent the currently viewed month
    const [currentDate, setCurrentDate] = useState<Date>(() => parseISO(businessDate));

    // Calculate start and end of the month
    const fromDate = startOfMonth(currentDate);
    const toDate = endOfMonth(currentDate);

    const formattedFrom = format(fromDate, 'yyyy-MM-dd');
    const formattedTo = format(toDate, 'yyyy-MM-dd');

    const [mode, setMode] = useState<'Forecast' | 'Actual'>('Actual');
    const [showRoomTypeBreakdown, setShowRoomTypeBreakdown] = useState(true);

    const params: GetOccupancyParams = useMemo(() => ({
        from: formattedFrom,
        to: formattedTo,
        mode,
        groupBy: showRoomTypeBreakdown ? 'both' : 'day',
    }), [formattedFrom, formattedTo, mode, showRoomTypeBreakdown]);

    const { data, isLoading, isError, error, refetch, isFetching } = useOccupancy(params);

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

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(2000, i, 1), 'MMMM', { locale: dateLocale })
    }));

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => (currentYear - 2 + i).toString());

    const handleThisMonth = () => {
        setCurrentDate(new Date());
    };

    // Format percentage
    const formatPercent = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '—';
        return `${(value * 100).toFixed(1)}%`;
    };

    // Get occupancy status color
    const getOccupancyColor = (rate: number, overbooked: boolean) => {
        if (overbooked) return 'bg-red-100 text-red-700 border-red-200';
        if (rate >= 0.9) return 'bg-green-100 text-green-700';
        if (rate >= 0.7) return 'bg-emerald-100 text-emerald-700';
        if (rate >= 0.5) return 'bg-amber-100 text-amber-700';
        return 'bg-slate-100 text-slate-600';
    };

    // Group room type data by date for expandable view
    const roomTypeByDate = useMemo(() => {
        if (!data?.byRoomTypeByDay) return {};
        const grouped: Record<string, typeof data.byRoomTypeByDay> = {};
        for (const item of data.byRoomTypeByDay) {
            if (!grouped[item.date]) grouped[item.date] = [];
            grouped[item.date].push(item);
        }
        return grouped;
    }, [data]);

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-800 shrink-0">
                    {t('occupancy.title')}
                </h1>

                {/* Controls Container */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">

                    {/* Date Navigation Group */}
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevMonth}
                            disabled={isFetching}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                            <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthSelect}>
                                <SelectTrigger className="w-[110px] h-8 border-none shadow-none focus:ring-0 font-medium">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearSelect}>
                                <SelectTrigger className="w-[80px] h-8 border-none shadow-none focus:ring-0 font-medium text-slate-500">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(year => (
                                        <SelectItem key={year} value={year}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNextMonth}
                            disabled={isFetching}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Actions Group */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleThisMonth}
                            disabled={isFetching}
                            className="h-9"
                        >
                            <CalendarDays className="w-4 h-4 me-2 opacity-70" />
                            {t('common.today', 'Today')}
                        </Button>

                        <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block" />

                        {/* Mode Toggle */}
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <button
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'Forecast'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                onClick={() => setMode('Forecast')}
                            >
                                {t('dashboard.forecast')}
                            </button>
                            <div className="w-px bg-slate-200" />
                            <button
                                className={`px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'Actual'
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                onClick={() => setMode('Actual')}
                            >
                                {t('dashboard.actual')}
                            </button>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-9 w-9 bg-white"
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="text-sm text-slate-500">
                {formattedFrom} → {formattedTo}
                {data && ` (${data.nightsCount} ${t('dashboard.nights')})`}
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="border-none shadow-sm">
                            <CardContent className="pt-6">
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-8 w-20" />
                            </CardContent>
                        </Card>
                    ))
                ) : data ? (
                    <>
                        <Card className="border-none shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-slate-600 mb-1">
                                    <Building2 className="w-4 h-4" />
                                    <span className="text-sm">{t('occupancy.total_rooms')}</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{data.totalRooms}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-slate-600 mb-1">
                                    <CalendarDays className="w-4 h-4" />
                                    <span className="text-sm">{t('occupancy.supply_room_nights')}</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{data.supplyRoomNights}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-slate-600 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">{t('occupancy.sold_room_nights')}</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{data.soldRoomNights}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-slate-600 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-sm">{t('occupancy.overall_rate')}</span>
                                </div>
                                <div className={`text-2xl font-bold ${data.occupancyRateOverall >= 0.7 ? 'text-green-600' :
                                    data.occupancyRateOverall >= 0.5 ? 'text-amber-600' : 'text-slate-900'
                                    }`}>
                                    {formatPercent(data.occupancyRateOverall)}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </div>

            {/* Daily Occupancy Table */}
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                        <CalendarDays className="w-5 h-5 text-slate-400" />
                        {t('occupancy.daily_breakdown')}
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRoomTypeBreakdown(!showRoomTypeBreakdown)}
                    >
                        {showRoomTypeBreakdown ? t('occupancy.hide_room_types') : t('occupancy.show_room_types')}
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : data?.byDay && data.byDay.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 font-medium text-slate-600">{t('occupancy.date')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('occupancy.occupied')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('occupancy.available')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('occupancy.total')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('occupancy.rate')}</th>
                                        <th className="text-center py-3 px-4 font-medium text-slate-600">{t('occupancy.status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.byDay.map((day: OccupancyDayDto) => (
                                        <Fragment key={day.date}>
                                            <tr className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 font-medium text-slate-900">{day.date}</td>
                                                <td className="py-3 px-4 text-right text-slate-700">{day.occupiedRooms}</td>
                                                <td className="py-3 px-4 text-right text-slate-500">{day.availableRooms}</td>
                                                <td className="py-3 px-4 text-right text-slate-500">{day.totalRooms}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getOccupancyColor(day.occupancyRate, day.overbooked)
                                                        }`}>
                                                        {formatPercent(day.occupancyRate)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {day.overbooked ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-medium">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            {t('occupancy.overbooked')}
                                                        </span>
                                                    ) : day.occupancyRate >= 0.9 ? (
                                                        <span className="text-xs text-green-600 font-medium">{t('occupancy.high')}</span>
                                                    ) : day.occupancyRate >= 0.5 ? (
                                                        <span className="text-xs text-amber-600 font-medium">{t('occupancy.moderate')}</span>
                                                    ) : (
                                                        <span className="text-xs text-slate-500">{t('occupancy.low')}</span>
                                                    )}
                                                </td>
                                            </tr>
                                            {/* Room Type Breakdown (expandable) */}
                                            {showRoomTypeBreakdown && roomTypeByDate[day.date]?.map((rt) => (
                                                <tr key={`${day.date}-${rt.roomTypeId}`} className="bg-slate-50 border-b border-slate-100">
                                                    <td className="py-2 px-4 pl-8 text-slate-600 text-xs">
                                                        ↳ {rt.roomTypeName || `Type #${rt.roomTypeId}`}
                                                    </td>
                                                    <td className="py-2 px-4 text-right text-slate-500 text-xs">{rt.occupiedRoomsOfType}</td>
                                                    <td className="py-2 px-4 text-right text-slate-400 text-xs">—</td>
                                                    <td className="py-2 px-4 text-right text-slate-400 text-xs">—</td>
                                                    <td className="py-2 px-4 text-right text-slate-400 text-xs">—</td>
                                                    <td className="py-2 px-4 text-center text-slate-400 text-xs">—</td>
                                                </tr>
                                            ))}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-slate-400">
                            {t('occupancy.no_data_for_range')}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Occupancy;
