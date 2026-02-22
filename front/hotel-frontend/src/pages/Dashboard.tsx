/**
 * Ras Sedr Rental - Strategic Performance Dashboard
 * Central intelligence hub for operational oversight, occupancy yield, and financial velocity.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';
import {
    Card,
    CardContent,
    CardHeader
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    DollarSign,
    BarChart3,
    Building2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Zap,
    LayoutGrid,
    Target
} from 'lucide-react';
import { useDashboard } from '@/hooks/dashboard';
import { formatCurrency, cn } from '@/lib/utils';
import { CurrencyCodeEnum, CurrencyCodeLabels } from '@/api/types/reservations';
import type { GetDashboardParams, DashboardSeriesPointDto } from '@/api/types/dashboard';

const Dashboard = () => {
    const { t } = useTranslation();
    const { businessDate } = useBusinessDate();

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

    const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useDashboard(params);

    const lastUpdated = useMemo(() => {
        if (!dataUpdatedAt) return t('common.never');
        return new Date(dataUpdatedAt).toLocaleTimeString();
    }, [dataUpdatedAt, t]);

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

    const formatPercent = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '—';
        return `${(value * 100).toFixed(1)}%`;
    };

    const kpiCards = data?.summary ? [
        {
            title: t('dashboard.occupancy_rate'),
            value: formatPercent(data.summary.occupancyRateOverall),
            icon: <TrendingUp className="w-4 h-4 text-purple-600" />,
            bg: 'bg-purple-100',
            trend: 'Overall Utilization'
        },
        {
            title: t('dashboard.total_revenue'),
            value: formatCurrency(data.summary.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
            bg: 'bg-emerald-100',
            trend: 'Gross Yield'
        },
        {
            title: t('dashboard.adr'),
            value: formatCurrency(data.summary.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <Target className="w-4 h-4 text-blue-600" />,
            bg: 'bg-blue-100',
            trend: 'Average Daily Rate'
        },
        {
            title: t('dashboard.revpar'),
            value: formatCurrency(data.summary.revPar, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <Zap className="w-4 h-4 text-amber-600" />,
            bg: 'bg-amber-100',
            trend: 'Rev. Per Available'
        },
    ] : [];

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* HIGH-IMPACT STICKY OPERATIONAL HEADER */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <BarChart3 className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('dashboard.title')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        System Active • {lastUpdated}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="hidden xs:flex items-center p-1 bg-white/5 border border-white/5 rounded-xl">
                                <button
                                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'Forecast' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    onClick={() => setMode('Forecast')}
                                >FCAST</button>
                                <button
                                    className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'Actual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    onClick={() => setMode('Actual')}
                                >ACTUAL</button>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5 text-slate-400", isFetching && "animate-spin text-blue-400")} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                        {/* Temporal Control */}
                        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-inner h-10 w-full sm:w-auto">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handlePrevWeek}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                            <div className="flex-1 text-center px-4">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                    {dateRange.from.substring(5)} → {dateRange.to.substring(5)}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleNextWeek}><ChevronRight className="w-3.5 h-3.5" /></Button>
                        </div>

                        {/* Currency Matrix */}
                        <div className="flex items-center p-1 bg-white/10 rounded-xl h-10 w-full sm:w-auto">
                            {Object.entries(CurrencyCodeLabels).map(([code, label]) => (
                                <button
                                    key={code}
                                    className={`flex-1 sm:flex-none px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${selectedCurrency === parseInt(code, 10) ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    onClick={() => handleCurrencyChange(parseInt(code, 10))}
                                >{label}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* PULSE KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[32px] bg-slate-50" />)
                ) : (
                    kpiCards.map((card, index) => (
                        <Card key={index} className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white group hover:border-blue-200 transition-all active:scale-[0.98]">
                            <CardContent className="p-5 flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.title}</span>
                                    <div className={cn("p-1.5 rounded-xl shadow-sm transition-all", card.bg)}>{card.icon}</div>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{card.value}</h3>
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{card.trend}</span>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* ANALYTICAL BREAKDOWN: DAILY SERIES */}
            <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                <CardHeader className="p-6 pb-2 flex items-center gap-2 border-b border-slate-50">
                    <div className="p-2 bg-slate-100 rounded-xl"><LayoutGrid className="w-4 h-4 text-slate-900" /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.daily_breakdown')}</span>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl bg-slate-50" />)}
                        </div>
                    ) : (
                        <div className="overflow-x-auto selection:bg-blue-50">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-tighter border-b border-slate-100">
                                        <th className="text-left py-4 px-8 sticky left-0 bg-slate-50/50 backdrop-blur z-10">Temporal</th>
                                        <th className="text-right py-4 px-4">OCC</th>
                                        <th className="text-center py-4 px-4">Utilization</th>
                                        <th className="text-right py-4 px-4">Rev Yield</th>
                                        <th className="text-right py-4 px-8">RevPAR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data?.byDay?.map((day: DashboardSeriesPointDto) => (
                                        <tr key={day.date} className="hover:bg-slate-50/80 transition-all group">
                                            <td className="py-4 px-8 font-black text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors uppercase tracking-tight">
                                                {day.date}
                                            </td>
                                            <td className="py-4 px-4 text-right font-bold text-slate-500">{day.occupiedRooms}/{day.totalRooms}</td>
                                            <td className="py-4 px-4 text-center">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-tighter border",
                                                    day.occupancyRate >= 0.8 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                        day.occupancyRate >= 0.5 ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                            "bg-slate-50 text-slate-400 border-slate-100"
                                                )}>
                                                    {formatPercent(day.occupancyRate)}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-right font-black text-slate-900">
                                                {formatCurrency(day.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                            </td>
                                            <td className="py-4 px-8 text-right font-bold text-slate-400">
                                                {formatCurrency(day.revPar, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SEGMENT BREAKDOWN: ROOM TYPES */}
            {data?.byRoomType && data.byRoomType.length > 0 && (
                <Card className="border border-slate-100 shadow-sm rounded-[32px] overflow-hidden bg-white">
                    <CardHeader className="p-6 pb-2 flex items-center gap-2 border-b border-slate-50">
                        <div className="p-2 bg-blue-50 rounded-xl"><Building2 className="w-4 h-4 text-blue-600" /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.by_room_type')}</span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-tighter border-b border-slate-100">
                                        <th className="text-left py-4 px-8">Segment Type</th>
                                        <th className="text-right py-4 px-4">Sold NTS</th>
                                        <th className="text-right py-4 px-4">Cumulative Rev</th>
                                        <th className="text-right py-4 px-8">ADR</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.byRoomType.map((rt) => (
                                        <tr key={rt.roomTypeId} className="hover:bg-slate-50/80 transition-all font-bold">
                                            <td className="py-4 px-8 text-slate-900 uppercase tracking-tighter">{rt.roomTypeName}</td>
                                            <td className="py-4 px-4 text-right text-slate-500">{rt.soldRoomNights}</td>
                                            <td className="py-4 px-4 text-right text-slate-900 font-black">
                                                {formatCurrency(rt.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                            </td>
                                            <td className="py-4 px-8 text-right text-slate-400">
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
        </div>
    );
};

export default Dashboard;
