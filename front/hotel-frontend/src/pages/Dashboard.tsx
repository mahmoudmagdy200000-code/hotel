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
    Target,
    Receipt,
    Wallet,
    PieChart
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboard } from '@/hooks/dashboard';
import { formatCurrency, cn } from '@/lib/utils';
import { CurrencyCodeEnum, CurrencyCodeLabels } from '@/api/types/reservations';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { GetDashboardParams, DashboardSeriesPointDto } from '@/api/types/dashboard';
import {
    getExpenseCategoryTranslationKey,
    getExpenseCategoryStyle
} from '@/api/types/expenses';

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
        if (!dataUpdatedAt) return t('never');
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

    // Compute trend direction from daily series (first half vs second half)
    const trends = useMemo(() => {
        const days = data?.byDay;
        if (!days || days.length < 2) return { occ: 0, rev: 0, adr: 0, revpar: 0 };
        const mid = Math.floor(days.length / 2);
        const firstHalf = days.slice(0, mid);
        const secondHalf = days.slice(mid);
        const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const pctChange = (first: number, second: number) => first === 0 ? 0 : ((second - first) / first) * 100;
        return {
            occ: pctChange(avg(firstHalf.map(d => d.occupancyRate)), avg(secondHalf.map(d => d.occupancyRate))),
            rev: pctChange(avg(firstHalf.map(d => d.revenue)), avg(secondHalf.map(d => d.revenue))),
            adr: pctChange(avg(firstHalf.map(d => d.adr)), avg(secondHalf.map(d => d.adr))),
            revpar: pctChange(avg(firstHalf.map(d => d.revPar)), avg(secondHalf.map(d => d.revPar))),
        };
    }, [data?.byDay]);

    const TrendIndicator = ({ value }: { value: number }) => {
        if (Math.abs(value) < 0.5) return <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Stable</span>;
        const isUp = value > 0;
        return (
            <span className={cn("inline-flex items-center gap-0.5 text-[9px] font-black tracking-tight", isUp ? "text-emerald-600" : "text-rose-500")}>
                <span className={cn("inline-block transition-transform", isUp ? "rotate-0" : "rotate-180")}
                    style={{ fontSize: '10px', lineHeight: 1 }}>▲</span>
                {Math.abs(value).toFixed(1)}%
            </span>
        );
    };

    const financialCards = data?.summary ? [
        {
            title: "Gross Revenue",
            value: formatCurrency(data.summary.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <DollarSign className="w-5 h-5 text-emerald-600" />,
            bg: 'bg-emerald-100',
            trendValue: trends.rev,
        },
        {
            title: "Total Expenses",
            value: formatCurrency(data.summary.totalExpenses, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <Receipt className="w-5 h-5 text-rose-600" />,
            bg: 'bg-rose-100',
            // No trend computed for expenses currently, so passing 0
            trendValue: 0,
        },
        {
            title: "Net Profit",
            value: formatCurrency(data.summary.netProfit, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <Wallet className="w-5 h-5 text-blue-600" />,
            bg: 'bg-blue-100',
            trendValue: trends.rev, // Net profit roughly follows revenue trend for now
        }
    ] : [];

    const operationalCards = data?.summary ? [
        {
            title: t('dashboard.occupancy_rate'),
            value: formatPercent(data.summary.occupancyRateOverall),
            icon: <TrendingUp className="w-4 h-4 text-purple-600" />,
            bg: 'bg-purple-100',
            trendValue: trends.occ,
        },
        {
            title: t('dashboard.adr'),
            value: formatCurrency(data.summary.adr, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <Target className="w-4 h-4 text-indigo-600" />,
            bg: 'bg-indigo-100',
            trendValue: trends.adr,
        },
        {
            title: t('dashboard.revpar'),
            value: formatCurrency(data.summary.revPar, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]),
            icon: <Zap className="w-4 h-4 text-amber-600" />,
            bg: 'bg-amber-100',
            trendValue: trends.revpar,
        },
    ] : [];

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* HIGH-IMPACT STICKY OPERATIONAL HEADER */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-2 bg-slate-900 shadow-2xl sm:rounded-2xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-xl border border-white/5 backdrop-blur-xl">
                                <BarChart3 className="w-4 h-4 text-blue-400" />
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

                    <div className="flex flex-col xl:flex-row items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
                        {/* Data Mode Selector */}
                        <div className="flex items-center p-1 bg-white/10 rounded-xl h-10 w-full xl:w-auto">
                            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-transparent border-none h-8 p-0">
                                    <TabsTrigger value="Actual" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all">
                                        Actuals
                                    </TabsTrigger>
                                    <TabsTrigger value="Forecast" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-lg transition-all">
                                        Forecast
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {/* Temporal Control */}
                        <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-inner h-10 w-full xl:w-auto">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handlePrevWeek}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                            <div className="flex-1 text-center px-4 min-w-[120px]">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                    {dateRange.from.substring(5)} → {dateRange.to.substring(5)}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleNextWeek}><ChevronRight className="w-3.5 h-3.5" /></Button>
                        </div>

                        {/* Currency Selector */}
                        <div className="w-full xl:w-auto">
                            <Select value={selectedCurrency.toString()} onValueChange={(val) => handleCurrencyChange(parseInt(val, 10))}>
                                <SelectTrigger className="h-8 w-full xl:w-[80px] bg-white/10 border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-lg">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(CurrencyCodeLabels).map(([code, label]) => (
                                        <SelectItem key={code} value={code}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* FINANCIAL KPI GRID */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl bg-slate-50" />)
                ) : (
                    financialCards.map((card, index) => (
                        <Card key={index} className={cn(
                            "border-none shadow-sm rounded-2xl overflow-hidden transition-all active:scale-[0.98] relative group",
                            index === 2 ? "bg-slate-900 col-span-2 xl:col-span-1" : "bg-white border border-slate-100"
                        )}>
                            <CardContent className="p-3 flex flex-col gap-2 relative z-10">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        index === 2 ? "text-slate-400" : "text-slate-400"
                                    )}>{card.title}</span>
                                    <div className={cn("p-1.5 rounded-xl shadow-sm transition-all", card.bg)}>
                                        {/* Reduced icon size by cloning and merging classes */}
                                        <card.icon.type {...card.icon.props} className={cn(card.icon.props.className, "w-4 h-4")} />
                                    </div>
                                </div>
                                <h3 className={cn(
                                    "text-xl font-black tracking-tighter leading-none",
                                    index === 2 ? "text-white" : "text-slate-900"
                                )}>{card.value}</h3>
                                {card.trendValue !== 0 && (
                                    <TrendIndicator value={card.trendValue} />
                                )}
                            </CardContent>
                            {index === 2 && (
                                <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
                                    <Wallet className="w-12 h-12 text-white" />
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>

            {/* OPERATIONAL KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-slate-50" />)
                ) : (
                    operationalCards.map((card, index) => (
                        <Card key={index} className={cn(
                            "border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white group hover:border-blue-200 transition-all active:scale-[0.98]",
                            index === 2 ? "col-span-2 lg:col-span-1" : ""
                        )}>
                            <CardContent className="p-3 flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{card.title}</span>
                                    <div className={cn("p-1.5 rounded-xl shadow-sm transition-all", card.bg)}>{card.icon}</div>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tighter leading-none">{card.value}</h3>
                                <TrendIndicator value={card.trendValue} />
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* ANALYTICAL BREAKDOWN: DAILY SERIES */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="p-3 pb-2 flex items-center gap-2 border-b border-slate-50">
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
                <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="p-3 pb-2 flex items-center gap-2 border-b border-slate-50">
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

            {/* FINANCIAL SEGMENTATION: EXPENSE DISTRIBUTION */}
            {data?.byCategory && data.byCategory.length > 0 && (
                <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="p-3 pb-2 flex items-center gap-2 border-b border-slate-50">
                        <div className="p-2 bg-rose-50 rounded-xl"><PieChart className="w-4 h-4 text-rose-600" /></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expense Distribution</span>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {data.byCategory
                                .sort((a, b) => b.amount - a.amount)
                                .map((item) => {
                                    const style = getExpenseCategoryStyle(item.categoryId as any);
                                    const percentage = (item.amount / data.summary.totalExpenses) * 100;
                                    const Icon = style.icon;

                                    return (
                                        <div key={item.categoryId} className="space-y-2 group">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("p-1.5 rounded-lg", style.bg, style.color)}>
                                                        <Icon className="w-3 h-3" />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">
                                                        {t(getExpenseCategoryTranslationKey(item.categoryId as any))}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] font-black text-slate-900 tracking-tighter block">
                                                        {formatCurrency(item.amount, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                    </span>
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                                        {percentage.toFixed(1)}% Share
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full transition-all duration-1000 ease-out", style.bg.replace('bg-', 'bg-opacity-100 bg-').split(' ')[0])}
                                                    style={{
                                                        width: `${percentage}%`,
                                                        backgroundColor: 'currentColor' // Fallback to class color if possible
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Dashboard;
