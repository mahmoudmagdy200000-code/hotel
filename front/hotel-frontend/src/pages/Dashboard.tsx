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
    Info,
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

    const { data, isLoading, isError, error, refetch, isFetching } = useDashboard(params);

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
            icon: <Building2 className="w-5 h-5 text-blue-600" />,
            bg: 'bg-blue-50',
        },
        {
            title: t('dashboard.sold_room_nights'),
            value: data.summary.soldRoomNights,
            subtitle: `${t('dashboard.of')} ${data.summary.supplyRoomNights} ${t('dashboard.supply')}`,
            icon: <DoorClosed className="w-5 h-5 text-green-600" />,
            bg: 'bg-green-50',
        },
        {
            title: t('dashboard.occupancy_rate'),
            value: formatPercent(data.summary.occupancyRateOverall),
            icon: <TrendingUp className="w-5 h-5 text-purple-600" />,
            bg: 'bg-purple-50',
        },
        {
            title: t('dashboard.total_revenue'),
            value: formatCurrency(data.summary.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
            bg: 'bg-emerald-50',
        },
        {
            title: t('dashboard.adr'),
            value: formatCurrency(data.summary.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <BarChart3 className="w-5 h-5 text-amber-600" />,
            bg: 'bg-amber-50',
        },
        {
            title: t('dashboard.revpar'),
            value: formatCurrency(data.summary.revPar, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <CalendarDays className="w-5 h-5 text-rose-600" />,
            bg: 'bg-rose-50',
        },
    ] : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                    {t('dashboard.title')}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mode === 'Actual' ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                        {mode === 'Actual' ? t('dashboard.mode_realized', 'Realized Only') : t('dashboard.mode_operational', 'Operational / Forecast')}
                    </span>
                </h1>

                {/* Date Range Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevWeek}
                        disabled={isFetching}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToday}
                        disabled={isFetching}
                    >
                        {t('dashboard.this_week')}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextWeek}
                        disabled={isFetching}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>

                    <div className="h-4 w-px bg-slate-300 mx-2" />

                    {/* Mode Toggle with Policy Info */}
                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                            <button
                                className={`px-4 py-1.5 text-sm font-medium transition-all ${mode === 'Forecast'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border-r border-slate-200'
                                    }`}
                                onClick={() => setMode('Forecast')}
                            >
                                {t('dashboard.forecast', 'Forecast')}
                            </button>
                            <button
                                className={`px-4 py-1.5 text-sm font-medium transition-all ${mode === 'Actual'
                                    ? 'bg-slate-800 text-white'
                                    : 'bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                onClick={() => setMode('Actual')}
                                title={t('dashboard.actual_tooltip', "Actual metrics include checked-out reservations only (accounting-based).")}
                            >
                                {t('dashboard.actual_realized', 'Actual (Realized)')}
                            </button>
                        </div>
                        <div className="group relative">
                            <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-slate-600 transition-colors" />
                            <div className="invisible group-hover:visible absolute right-0 mt-2 w-64 p-4 bg-white border border-slate-200 rounded-xl shadow-2xl text-sm text-slate-600 z-50 pointer-events-none">
                                <p className="font-bold text-slate-900 mb-2">{t('dashboard.metrics_policy', 'Accounting Metrics Policy')}</p>
                                <div className="space-y-3 text-xs leading-relaxed">
                                    <p>
                                        <span className="font-bold text-slate-800 uppercase text-[10px] bg-slate-100 px-1 rounded mr-1">Actual</span>
                                        {t('dashboard.actual_policy', 'Includes checked-out reservations only. Represents finalized, auditable revenue.')}
                                    </p>
                                    <p>
                                        <span className="font-bold text-blue-700 uppercase text-[10px] bg-blue-50 px-1 rounded mr-1">Forecast</span>
                                        {t('dashboard.forecast_policy', 'Includes confirmed + in-house + checked-out. Represents operational reality.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-4 w-px bg-slate-300 mx-2" />

                    {/* Currency Selector */}
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                        {Object.entries(CurrencyCodeLabels).map(([code, label]) => (
                            <button
                                key={code}
                                className={`px-3 py-1.5 text-xs font-bold transition-all ${selectedCurrency === parseInt(code, 10)
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border-r border-slate-100 last:border-r-0'
                                    }`}
                                onClick={() => handleCurrencyChange(parseInt(code, 10))}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-1" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Date Range Display */}
            <div className="text-sm text-slate-500">
                {dateRange.from} → {dateRange.to}
                {data?.summary && ` (${data.summary.nightsCount} ${t('dashboard.nights')})`}
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {isLoading ? (
                    // Skeleton loading
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="border-none shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-9 w-9 rounded-lg" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-20 mb-2" />
                                <Skeleton className="h-3 w-16" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    kpiCards.map((card, index) => (
                        <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-600">
                                    {card.title}
                                </CardTitle>
                                <div className={`${card.bg} p-2 rounded-lg`}>
                                    {card.icon}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">
                                    {card.value}
                                </div>
                                {card.subtitle && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {card.subtitle}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Daily Series Table */}
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                        {t('dashboard.daily_breakdown')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-full" />
                            ))}
                        </div>
                    ) : data?.byDay && data.byDay.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 font-medium text-slate-600">{t('dashboard.date')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.occupied')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.total_rooms')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.occupancy_rate')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.revenue')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.adr')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.revpar')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.byDay.map((day: DashboardSeriesPointDto) => (
                                        <tr key={day.date} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-4 font-medium text-slate-900">{day.date}</td>
                                            <td className="py-3 px-4 text-right text-slate-700">{day.occupiedRooms}</td>
                                            <td className="py-3 px-4 text-right text-slate-500">{day.totalRooms}</td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${day.occupancyRate >= 0.8 ? 'bg-green-100 text-green-700' :
                                                    day.occupancyRate >= 0.5 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {formatPercent(day.occupancyRate)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(day.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}</td>
                                            <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(day.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}</td>
                                            <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(day.revPar, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="h-32 flex items-center justify-center text-slate-400">
                            {t('dashboard.no_data_for_range')}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Room Type Breakdown (optional) */}
            {data?.byRoomType && data.byRoomType.length > 0 && (
                <Card className="border-none shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                            <Building2 className="w-5 h-5 text-slate-400" />
                            {t('dashboard.by_room_type')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 font-medium text-slate-600">{t('dashboard.room_type')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.sold_room_nights')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.revenue')}</th>
                                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dashboard.adr')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.byRoomType.map((rt) => (
                                        <tr key={rt.roomTypeId} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-4 font-medium text-slate-900">{rt.roomTypeName || `Type #${rt.roomTypeId}`}</td>
                                            <td className="py-3 px-4 text-right text-slate-700">{rt.soldRoomNights}</td>
                                            <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(rt.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}</td>
                                            <td className="py-3 px-4 text-right text-slate-500">{formatCurrency(rt.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Dashboard;
