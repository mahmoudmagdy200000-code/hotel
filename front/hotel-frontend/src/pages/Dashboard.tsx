/**
 * Dashboard Page - FE-7
 * Displays KPI summary cards, daily series, and optional room type breakdown
 * Data from: GET /api/dashboard
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    DoorClosed,
    TrendingUp,
    CalendarDays,
    DollarSign,
    BarChart3,
    Building2,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useDashboard } from '@/hooks/dashboard';
import { formatCurrency } from '@/lib/utils';
import { CurrencyCodeEnum, CurrencyCodeLabels } from '@/api/types/reservations';
import type { GetDashboardParams, DashboardSeriesPointDto } from '@/api/types/dashboard';

const Dashboard = () => {
    const { t } = useTranslation();
    const { businessDate } = useBusinessDate();

    // Default to businessDate + 7 days
    const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
        const start = new Date(businessDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return {
            from: start.toISOString().split('T')[0],
            to: end.toISOString().split('T')[0],
        };
    });
    const [mode, setMode] = useState<'Forecast' | 'Actual'>('Actual');
    const [selectedCurrency, setSelectedCurrency] = useState<number>(() => {
        const saved = localStorage.getItem('pms.currency');
        return saved ? parseInt(saved, 10) : CurrencyCodeEnum.EGP;
    });

    const handleCurrencyChange = (val: number) => {
        setSelectedCurrency(val);
        localStorage.setItem('pms.currency', val.toString());
    };

    const params: GetDashboardParams = useMemo(() => ({
        from: dateRange.from,
        to: dateRange.to,
        mode,
        includeRoomTypeBreakdown: true,
        currency: selectedCurrency,
    }), [dateRange, mode, selectedCurrency]);

    const { data, isLoading, isError, error, refetch, isFetching, dataUpdatedAt } = useDashboard(params);

    const lastUpdated = useMemo(() => {
        if (!dataUpdatedAt) return t('common.never', 'Never');
        return new Date(dataUpdatedAt).toLocaleTimeString();
    }, [dataUpdatedAt, t]);

    const handleRefresh = async () => {
        await refetch();
    };

    const handlePrevWeek = () => {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        fromDate.setDate(fromDate.getDate() - 7);
        toDate.setDate(toDate.getDate() - 7);
        setDateRange({
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
        });
    };

    const handleNextWeek = () => {
        const fromDate = new Date(dateRange.from);
        const toDate = new Date(dateRange.to);
        fromDate.setDate(fromDate.getDate() + 7);
        toDate.setDate(toDate.getDate() + 7);
        setDateRange({
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
        });
    };

    const handleToday = () => {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        setDateRange({
            from: today.toISOString().split('T')[0],
            to: nextWeek.toISOString().split('T')[0],
        });
    };

    // Format percentage
    const formatPercent = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '—';
        return `${(value * 100).toFixed(1)}%`;
    };

    // KPI cards configuration
    const kpiCards = data?.summary ? [
        {
            title: t('dashboard.total_rooms'),
            value: data.summary.totalRooms,
            icon: <Building2 className="w-4 h-4 text-blue-600" />,
            bg: 'bg-blue-50',
        },
        {
            title: t('dashboard.sold_room_nights'),
            value: data.summary.soldRoomNights,
            subtitle: `${t('dashboard.of')} ${data.summary.supplyRoomNights} ${t('dashboard.supply')}`,
            icon: <DoorClosed className="w-4 h-4 text-emerald-600" />,
            bg: 'bg-emerald-50',
        },
        {
            title: t('dashboard.occupancy_rate'),
            value: formatPercent(data.summary.occupancyRateOverall),
            icon: <TrendingUp className="w-4 h-4 text-purple-600" />,
            bg: 'bg-purple-50',
        },
        {
            title: t('dashboard.total_revenue'),
            value: formatCurrency(data.summary.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
            bg: 'bg-emerald-50',
        },
        {
            title: t('dashboard.adr'),
            value: formatCurrency(data.summary.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <BarChart3 className="w-4 h-4 text-amber-600" />,
            bg: 'bg-amber-50',
        },
        {
            title: t('dashboard.revpar'),
            value: formatCurrency(data.summary.revPar, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <CalendarDays className="w-4 h-4 text-rose-600" />,
            bg: 'bg-rose-50',
        },
    ] : [];

    return (
        <div className="space-y-6 pb-20 sm:pb-6">
            {/* Header: Core Navigation & "Pulse" Status */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                        {t('dashboard.title')}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${mode === 'Actual' ? 'bg-slate-200 text-slate-600' : 'bg-blue-600 text-white'
                            }`}>
                            {mode === 'Actual' ? t('dashboard.mode_realized', 'Actual / Realized') : t('dashboard.mode_operational', 'Operational / Forecast')}
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
                    className="rounded-full hover:bg-slate-100 flex-shrink-0 transition-transform active:scale-95"
                    onClick={handleRefresh}
                    disabled={isFetching}
                >
                    <RefreshCw className={`w-5 h-5 text-slate-400 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Thumb-Zone Controls (Mobile Optimized Floating Bar) */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md py-3 -mx-4 px-4 sm:relative sm:top-auto sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0 border-b lg:border-none border-slate-100 shadow-sm sm:shadow-none">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-1">
                        {/* Mode Selector */}
                        <div className="flex items-center p-1 bg-slate-100 border border-slate-200/50 rounded-xl">
                            <button
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'Forecast'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                onClick={() => setMode('Forecast')}
                            >
                                {t('dashboard.forecast', 'Forecast')}
                            </button>
                            <button
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'Actual'
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                onClick={() => setMode('Actual')}
                            >
                                {t('dashboard.actual_realized', 'Actual')}
                            </button>
                        </div>

                        {/* Currency Selector */}
                        <div className="flex items-center p-1 bg-slate-100 border border-slate-200/50 rounded-xl">
                            {Object.entries(CurrencyCodeLabels).map(([code, label]) => (
                                <button
                                    key={code}
                                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${selectedCurrency === parseInt(code, 10)
                                        ? 'bg-emerald-600 text-white shadow-md'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    onClick={() => handleCurrencyChange(parseInt(code, 10))}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-1 sm:gap-4 flex-nowrap">
                        {/* Date Navigation */}
                        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm flex-shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg"
                                onClick={handlePrevWeek}
                                disabled={isFetching}
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                            <button
                                onClick={handleToday}
                                className="px-2 py-1 text-[9px] font-black text-slate-800 uppercase tracking-tighter hover:bg-slate-50 rounded-lg transition-colors"
                            >
                                {t('dashboard.this_week')}
                            </button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-lg"
                                onClick={handleNextWeek}
                                disabled={isFetching}
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                        </div>

                        {/* Date Range Label: Aggressively compact for mobile single-line pulse */}
                        <div className="flex items-center justify-end flex-1 min-w-0">
                            <div className="flex items-center gap-1 bg-slate-100/80 px-2 py-1.5 rounded-lg border border-slate-200/50 whitespace-nowrap overflow-hidden max-w-full">
                                <CalendarDays className="w-3 h-3 text-slate-400 hidden xs:block" />
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter flex items-center gap-0.5">
                                    <span className="text-slate-900">{dateRange.from.substring(5)}</span>
                                    <span className="text-slate-300">→</span>
                                    <span className="text-slate-900">{dateRange.to.substring(5)}</span>
                                    {data?.summary && (
                                        <span className="ms-1 ps-1 border-s border-slate-200 text-slate-400 font-bold lowercase">
                                            {data.summary.nightsCount}n
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {isError ? (
                <Card className="border-rose-200 bg-rose-50/50">
                    <CardContent className="py-8 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-4 text-rose-700">
                            <div className="p-3 bg-rose-100 rounded-full">
                                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-lg leading-none">{t('common.error_loading')}</h3>
                                <p className="text-sm text-rose-600/80">{(error as Error)?.message || 'Internal connection error'}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="sm:ml-auto border-rose-200 hover:bg-rose-100 text-rose-700 font-bold uppercase tracking-widest text-[10px]">
                                {t('common.retry')}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* KPI Cards: Critical 2x2 Grid for Mobile Pulse */}
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <Card key={i} className="border border-slate-100 shadow-sm h-28 sm:h-32">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2">
                                        <Skeleton className="h-2.5 w-16" />
                                        <Skeleton className="h-7 w-7 rounded-lg" />
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <Skeleton className="h-7 w-20 mb-2" />
                                        <Skeleton className="h-2.5 w-12" />
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            kpiCards.map((card, index) => (
                                <Card key={index} className="border border-slate-100 shadow-sm transition-all hover:bg-slate-50/50 active:scale-[0.98] group">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                        <CardTitle className="text-[10px] uppercase font-black text-slate-400 tracking-wider group-hover:text-slate-600 transition-colors">
                                            {card.title}
                                        </CardTitle>
                                        <div className={`${card.bg} p-1.5 rounded-lg group-hover:shadow-sm transition-all`}>
                                            {card.icon}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none tracking-tight">
                                            {card.value || '0'}
                                        </div>
                                        {card.subtitle ? (
                                            <p className="text-[10px] font-bold text-slate-400 truncate mt-1.5">
                                                {card.subtitle}
                                            </p>
                                        ) : (
                                            <div className="h-[14px]" />
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>

                    {/* Daily Series Table: Redefined for Premium Experience */}
                    <Card className="border border-slate-100 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/30 border-b border-slate-100 py-3">
                            <CardTitle className="text-[10px] font-black flex items-center gap-2 text-slate-500 uppercase tracking-widest leading-none">
                                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                                {t('dashboard.daily_breakdown')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-4 space-y-3">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Skeleton key={i} className="h-9 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : data?.byDay && data.byDay.length > 0 ? (
                                <div className="overflow-x-auto selection:bg-blue-50">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-tighter border-b border-slate-100">
                                                <th className="text-left py-3.5 px-6 sticky left-0 bg-slate-50/50 backdrop-blur z-10">{t('dashboard.date')}</th>
                                                <th className="text-right py-3.5 px-4">{t('dashboard.occupied')}</th>
                                                <th className="text-right py-3.5 px-4">{t('dashboard.total_rooms')}</th>
                                                <th className="text-center py-3.5 px-4">{t('dashboard.occupancy_rate')}</th>
                                                <th className="text-right py-3.5 px-4">{t('dashboard.revenue')}</th>
                                                <th className="text-right py-3.5 px-4">{t('dashboard.adr')}</th>
                                                <th className="text-right py-3.5 px-6">{t('dashboard.revpar')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {data.byDay.map((day: DashboardSeriesPointDto) => (
                                                <tr key={day.date} className="hover:bg-blue-50/30 transition-all group">
                                                    <td className="py-3.5 px-6 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-blue-50/30 backdrop-blur transition-colors">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                            {day.date}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-slate-700 font-medium">{day.occupiedRooms}</td>
                                                    <td className="py-3.5 px-4 text-right text-slate-400">{day.totalRooms}</td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`inline-flex items-center justify-center min-w-[48px] px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-tighter ${day.occupancyRate >= 0.8 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                            day.occupancyRate >= 0.5 ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                'bg-slate-50 text-slate-400 border border-slate-100'
                                                            }`}>
                                                            {formatPercent(day.occupancyRate)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-slate-900 font-black">
                                                        {formatCurrency(day.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-slate-500 font-bold">
                                                        {formatCurrency(day.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-right text-slate-500 font-bold bg-slate-50/5">
                                                        {formatCurrency(day.revPar, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="h-32 flex flex-col items-center justify-center text-slate-300 gap-2">
                                    <BarChart3 className="w-8 h-8 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">{t('dashboard.no_data_for_range')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Room Type Breakdown: Enhanced Presentation */}
                    {data?.byRoomType && data.byRoomType.length > 0 && (
                        <Card className="border border-slate-100 shadow-sm overflow-hidden">
                            <CardHeader className="bg-slate-50/30 border-b border-slate-100 py-3">
                                <CardTitle className="text-[10px] font-black flex items-center gap-2 text-slate-500 uppercase tracking-widest leading-none">
                                    <Building2 className="w-3.5 h-3.5 text-purple-500" />
                                    {t('dashboard.by_room_type')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-tighter border-b border-slate-100">
                                                <th className="text-left py-3.5 px-6">{t('dashboard.room_type')}</th>
                                                <th className="text-right py-3.5 px-4">{t('dashboard.sold_room_nights')}</th>
                                                <th className="text-right py-3.5 px-4">{t('dashboard.revenue')}</th>
                                                <th className="text-right py-3.5 px-6">{t('dashboard.adr')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {data.byRoomType.map((rt) => (
                                                <tr key={rt.roomTypeId} className="hover:bg-purple-50/30 transition-all">
                                                    <td className="py-3.5 px-6 font-bold text-slate-900">{rt.roomTypeName || `Type #${rt.roomTypeId}`}</td>
                                                    <td className="py-3.5 px-4 text-right text-slate-700 font-medium">{rt.soldRoomNights}</td>
                                                    <td className="py-3.5 px-4 text-right text-slate-900 font-black">
                                                        {formatCurrency(rt.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                    </td>
                                                    <td className="py-3.5 px-6 text-right text-slate-500 font-bold">
                                                        {formatCurrency(rt.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
};

export default Dashboard;
