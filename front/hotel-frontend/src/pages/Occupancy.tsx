/**
 * Occupancy Page - FE-7
 * Displays occupancy forecast/actual data with daily breakdown
 * Data from: GET /api/occupancy
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
    CalendarDays,
    TrendingUp,
    Building2,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    BarChart3,
    ArrowRight,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useOccupancy } from '@/hooks/dashboard';
import { cn } from '@/lib/utils';
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

    const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useOccupancy(params);

    const lastUpdated = useMemo(() => {
        if (!dataUpdatedAt) return t('common.never', 'Never');
        return new Date(dataUpdatedAt).toLocaleTimeString();
    }, [dataUpdatedAt, t]);

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
        return `${(value * 100).toFixed(0)}%`;
    };

    // Get occupancy status color mapping
    const getStatusTheme = (rate: number, overbooked: boolean) => {
        if (overbooked) return { label: 'Crisis/Overbooked', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: AlertTriangle };
        if (rate >= 0.9) return { label: 'High Demand', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: TrendingUp };
        if (rate >= 0.6) return { label: 'Moderate', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: BarChart3 };
        return { label: 'Available/Low', color: 'bg-slate-50 text-slate-400 border-slate-100', icon: AlertCircle };
    };

    // Group room type data by date
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
        <div className="space-y-6 pb-20 sm:pb-6 font-sans selection:bg-blue-100">
            {/* Header: Core Navigation & "Pulse" Status */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none uppercase">
                        {t('occupancy.title')}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${mode === 'Actual' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'}`}>
                            {mode === 'Actual' ? t('dashboard.mode_realized', 'Actual') : t('dashboard.mode_operational', 'Forecast')}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                            {lastUpdated}
                        </div>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full hover:bg-slate-100 active:scale-95 transition-all h-11 w-11"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Premium Control Bar */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md py-3 -mx-4 px-4 sm:relative sm:top-auto sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0 border-b lg:border-none border-slate-100 shadow-sm sm:shadow-none">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-2">
                        {/* Month/Year Selector Group */}
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm overflow-hidden flex-1 sm:flex-none">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handlePrevMonth}
                                disabled={isFetching}
                                className="h-9 w-9 rounded-xl hover:bg-slate-50"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600" />
                            </Button>

                            <div className="flex items-center gap-1">
                                <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthSelect}>
                                    <SelectTrigger className="h-9 border-none bg-transparent shadow-none focus:ring-0 font-black text-[10px] uppercase tracking-widest text-slate-900 min-w-[80px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="h-4 w-px bg-slate-200" />

                                <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearSelect}>
                                    <SelectTrigger className="h-9 border-none bg-transparent shadow-none focus:ring-0 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[60px]">
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
                                className="h-9 w-9 rounded-xl hover:bg-slate-50"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                            </Button>
                        </div>

                        {/* Today shortcut */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleThisMonth}
                            disabled={isFetching}
                            className="hidden sm:flex h-11 rounded-2xl border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            <CalendarDays className="w-4 h-4 me-2 text-slate-400" />
                            {t('common.today', 'Jump to Today')}
                        </Button>
                    </div>

                    <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pb-1">
                        {/* Mode Selector */}
                        <div className="flex items-center p-1 bg-slate-100 border border-slate-200/50 rounded-2xl">
                            <button
                                className={cn(
                                    "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                    mode === 'Forecast' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:text-slate-700"
                                )}
                                onClick={() => setMode('Forecast')}
                            >
                                {t('dashboard.forecast')}
                            </button>
                            <button
                                className={cn(
                                    "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                    mode === 'Actual' ? "bg-slate-900 text-white shadow-md shadow-slate-200" : "text-slate-500 hover:text-slate-700"
                                )}
                                onClick={() => setMode('Actual')}
                            >
                                {t('dashboard.actual')}
                            </button>
                        </div>

                        {/* Breakdown Toggle */}
                        <button
                            onClick={() => setShowRoomTypeBreakdown(!showRoomTypeBreakdown)}
                            className={cn(
                                "flex items-center gap-2 px-5 py-2 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all",
                                showRoomTypeBreakdown
                                    ? "bg-slate-50 border-slate-200 text-slate-900"
                                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                        >
                            <BarChart3 className={cn("w-3.5 h-3.5", showRoomTypeBreakdown ? "text-blue-500" : "text-slate-300")} />
                            {showRoomTypeBreakdown ? t('occupancy.hide_room_types') : t('occupancy.details')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Date Range Meta */}
            <div className="flex items-center gap-2 px-1">
                <div className="flex items-center gap-2 bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-100">
                    <CalendarDays className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {formattedFrom} <ArrowRight className="inline w-2.5 h-2.5 mx-1 opacity-30" /> {formattedTo}
                    </span>
                    {data && (
                        <span className="ms-2 ps-2 border-s border-white text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                            {data.nightsCount} {t('dashboard.nights')}
                        </span>
                    )}
                </div>
            </div>

            {/* Error State */}
            {isError && (
                <Card className="rounded-3xl border-rose-200 bg-rose-50/50">
                    <CardContent className="py-8">
                        <div className="flex flex-col sm:flex-row items-center gap-4 text-rose-700">
                            <div className="p-3 bg-rose-100 rounded-full">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div className="space-y-1 text-center sm:text-left">
                                <h3 className="font-black text-lg leading-none uppercase tracking-tight">{t('common.error_loading')}</h3>
                                <p className="text-sm text-rose-600/80 font-medium">{(error as Error)?.message || 'Synchronisation failure'}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                                className="sm:ml-auto border-rose-200 hover:bg-rose-100 text-rose-700 font-black uppercase tracking-widest text-[10px] h-11 px-6 rounded-xl"
                            >
                                {t('common.retry')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Summary Metrics: Compact 2x2/4 Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                    title={t('occupancy.total_rooms')}
                    value={data?.totalRooms || 0}
                    icon={<Building2 className="w-4 h-4 text-slate-500" />}
                    bg="bg-slate-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('occupancy.sold_room_nights')}
                    value={data?.soldRoomNights || 0}
                    icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
                    bg="bg-blue-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('occupancy.supply_room_nights')}
                    value={data?.supplyRoomNights || 0}
                    icon={<CalendarDays className="w-4 h-4 text-slate-400" />}
                    bg="bg-slate-50"
                    isLoading={isLoading}
                />
                <MetricCard
                    title={t('occupancy.overall_rate')}
                    value={formatPercent(data?.occupancyRateOverall)}
                    icon={<BarChart3 className="w-4 h-4 text-emerald-500" />}
                    bg="bg-emerald-50"
                    isLoading={isLoading}
                    highlight={(data?.occupancyRateOverall ?? 0) >= 0.7 ? 'text-emerald-600' : (data?.occupancyRateOverall ?? 0) >= 0.4 ? 'text-blue-600' : ''}
                />
            </div>

            {/* Daily Occupancy Breakdown */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                        {t('occupancy.daily_breakdown')}
                    </h2>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : data?.byDay && data.byDay.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {data.byDay.map((day: OccupancyDayDto) => (
                            <DailyCard
                                key={day.date}
                                day={day}
                                breakdown={roomTypeByDate[day.date]}
                                showBreakdown={showRoomTypeBreakdown}
                                getStatusTheme={getStatusTheme}
                                t={t}
                                formatPercent={formatPercent}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <CalendarDays className="w-12 h-12 text-slate-200 mb-4" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {t('occupancy.no_data_for_range')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Standardized Sub-components ---

const MetricCard = ({ title, value, icon, bg, isLoading, highlight }: { title: string, value: string | number, icon: React.ReactNode, bg: string, isLoading: boolean, highlight?: string }) => (
    <Card className="border border-slate-100 shadow-sm transition-all hover:bg-white active:scale-[0.98] group rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
            <CardTitle className="text-[9px] uppercase font-black text-slate-400 tracking-wider group-hover:text-slate-600 transition-colors">
                {title}
            </CardTitle>
            <div className={`${bg} p-1.5 rounded-lg group-hover:shadow-sm transition-all`}>
                {icon}
            </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
            {isLoading ? <Skeleton className="h-7 w-12" /> : (
                <div className={cn("text-xl sm:text-2xl font-black text-slate-900 leading-none tracking-tight", highlight)}>
                    {value}
                </div>
            )}
        </CardContent>
    </Card>
);

const DailyCard = ({ day, breakdown, showBreakdown, getStatusTheme, t, formatPercent }: { day: OccupancyDayDto, breakdown?: any[], showBreakdown: boolean, getStatusTheme: any, t: any, formatPercent: any }) => {
    const theme = getStatusTheme(day.occupancyRate, day.overbooked);
    const StatusIcon = theme.icon;
    const [expanded, setExpanded] = useState(false);

    return (
        <Card className={cn(
            "border border-slate-100 shadow-sm rounded-[12px] overflow-hidden bg-white transition-all hover:border-slate-300 flex flex-col h-full",
            day.overbooked ? "border-rose-200 bg-rose-50/10 ring-1 ring-rose-50" : ""
        )}>
            <div className="p-4 space-y-4 flex-1">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{day.date}</h3>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border w-fit font-black text-[9px] uppercase tracking-tighter bg-white/50">
                            <span className="text-slate-400">{t('occupancy.total')}</span>
                            <span className="text-slate-900">{day.totalRooms}</span>
                        </div>
                    </div>
                    <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg border font-black text-[10px] uppercase tracking-widest shadow-sm transition-transform group-hover:scale-105", theme.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {formatPercent(day.occupancyRate)}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('occupancy.occupied')}</p>
                        <p className="text-lg font-black text-slate-900 leading-none">{day.occupiedRooms}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100/50">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('occupancy.available')}</p>
                        <p className="text-lg font-black text-slate-700 leading-none">{day.availableRooms}</p>
                    </div>
                </div>

                {/* Overbooked Warning */}
                {day.overbooked && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-200">
                        <AlertTriangle className="w-4 h-4 animate-bounce" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('occupancy.overbooked')}</span>
                    </div>
                )}

                {/* Breakdown List */}
                {showBreakdown && breakdown && breakdown.length > 0 && (
                    <div className="pt-2 space-y-2 border-t border-slate-50">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center justify-between w-full text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                        >
                            <span>{t('occupancy.room_types')} ({breakdown.length})</span>
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {expanded && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                                {breakdown.map((rt) => (
                                    <div key={rt.roomTypeId} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100/20">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                            <span className="text-[10px] font-bold text-slate-600 uppercase truncate">{rt.roomTypeName || `#${rt.roomTypeId}`}</span>
                                        </div>
                                        <div className="ps-2 flex items-center gap-2 border-s border-white">
                                            <span className="text-[10px] font-black text-slate-900">{rt.occupiedRoomsOfType}</span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase leading-none">Sold</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-2 bg-slate-50/30 border-t border-slate-50 flex items-center justify-center">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">{theme.label}</p>
            </div>
        </Card>
    );
};

export default Occupancy;
