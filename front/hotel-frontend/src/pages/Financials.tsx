import { useState, useMemo, useEffect } from 'react';
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
    TrendingUp,
    Zap,
    ChevronUp,
    ChevronDown,
    LayoutGrid,
    PieChart
} from 'lucide-react';
import { useRevenueSummary } from '@/hooks/dashboard';
import { formatCurrency, cn } from '@/lib/utils';
import { CurrencyCodeEnum, CurrencyCodeLabels } from '@/api/types/reservations';
import type { GetRevenueSummaryParams, RevenueSummaryItemDto } from '@/api/types/dashboard';

/**
 * Ras Sedr Rental - Financial Analysis
 * High-density operational dashboard for revenue tracking and forecasting.
 */

const formatYYYYMMDD = (date: Date) => {
    return format(date, 'yyyy-MM-dd');
};

const Financials = () => {
    const { t, i18n } = useTranslation();
    const { businessDate } = useBusinessDate();
    const dateLocale = i18n.language === 'ar' ? ar : enUS;

    const [currentDate, setCurrentDate] = useState<Date>(() => parseISO(businessDate));

    const fromDate = startOfMonth(currentDate);
    const toDate = endOfMonth(currentDate);

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
        from: formatYYYYMMDD(fromDate),
        to: formatYYYYMMDD(toDate),
        mode,
        groupBy,
        currency: selectedCurrency,
    }), [fromDate, toDate, mode, groupBy, selectedCurrency]);

    const { data, isLoading, isError, error, refetch, isFetching } = useRevenueSummary(params);

    const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
    const handleMonthSelect = (val: string) => setCurrentDate(prev => setMonth(prev, parseInt(val)));
    const handleYearSelect = (val: string) => setCurrentDate(prev => setYear(prev, parseInt(val)));
    const handleThisMonth = () => setCurrentDate(parseISO(businessDate));

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i.toString(),
        label: format(new Date(2000, i, 1), 'MMMM', { locale: dateLocale })
    }));

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => (currentYear - 2 + i).toString());

    const maxRevenue = useMemo(() => {
        if (!data?.items || data.items.length === 0) return 0;
        return Math.max(...data.items.map(item => item.revenue));
    }, [data]);

    const bestItem = useMemo(() => {
        if (!data?.items || data.items.length === 0) return null;
        return [...data.items].sort((a, b) => b.revenue - a.revenue)[0];
    }, [data]);

    const formatLabel = (key: string) => {
        if (groupBy === 'day') {
            const date = new Date(key);
            return format(date, 'eee, MMM d', { locale: dateLocale });
        }
        if (groupBy === 'room') return `${t('financials.room')} ${key}`;
        return key;
    };

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* STICKY ACTION BAR */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('financials.title')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10 active:scale-[0.98]"
                                onClick={handleThisMonth}
                                title="Current Month"
                            >
                                <Zap className="h-3.5 w-3.5 text-amber-400" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5 text-slate-400", isFetching && "animate-spin text-emerald-400")} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-inner h-10">
                            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></Button>
                            <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthSelect}>
                                <SelectTrigger className="h-8 border-none shadow-none font-black text-[10px] uppercase tracking-widest w-[110px] focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value} className="text-[10px] font-black uppercase">{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearSelect}>
                                <SelectTrigger className="h-8 border-none shadow-none font-bold text-[10px] w-[70px] focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-none shadow-2xl">
                                    {years.map(y => (
                                        <SelectItem key={y} value={y} className="text-[10px] font-bold">{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></Button>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex flex-1 sm:flex-none p-1 bg-white/10 rounded-xl border border-white/5">
                                <button
                                    className={cn(
                                        "flex-1 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        mode === 'actual' ? "bg-white text-slate-900 shadow-lg" : "text-white/40 hover:text-white"
                                    )}
                                    onClick={() => setMode('actual')}
                                >
                                    {t('dashboard.actual')}
                                </button>
                                <button
                                    className={cn(
                                        "flex-1 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        mode === 'forecast' ? "bg-white text-slate-900 shadow-lg" : "text-white/40 hover:text-white"
                                    )}
                                    onClick={() => setMode('forecast')}
                                >
                                    {t('dashboard.forecast')}
                                </button>
                            </div>

                            <div className="flex p-1 bg-white rounded-xl shadow-inner h-10">
                                {Object.entries(CurrencyCodeLabels).map(([code, label]) => (
                                    <button
                                        key={code}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all",
                                            selectedCurrency === parseInt(code, 10) ? "bg-slate-900 text-white shadow-xl" : "text-slate-400 hover:text-slate-600"
                                        )}
                                        onClick={() => handleCurrencyChange(parseInt(code, 10))}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="bg-emerald-600 border-none rounded-[32px] shadow-2xl overflow-hidden relative group">
                    <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-24 h-24 text-white" />
                    </div>
                    <CardContent className="p-6 relative">
                        <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest block mb-1">
                            {t('financials.total_revenue')}
                        </span>
                        {isLoading ? (
                            <Skeleton className="h-10 w-32 bg-emerald-500" />
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-3xl font-black text-white tracking-tighter leading-none">
                                    {data ? formatCurrency(data.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]) : '—'}
                                </h2>
                                <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest bg-emerald-700/50 px-2 py-0.5 rounded-lg border border-white/10">
                                    {mode}
                                </span>
                            </div>
                        )}
                        <p className="text-[10px] font-bold text-emerald-200/60 mt-4 uppercase tracking-tighter leading-tight">
                            {mode === 'forecast' ? "Projected gross earnings based on active reservations." : "Realized income from checked-in/out stays."}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-none rounded-[32px] shadow-2xl overflow-hidden relative group">
                    <CardContent className="p-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            Best Performing Segment
                        </span>
                        {isLoading ? (
                            <Skeleton className="h-10 w-32 bg-slate-800" />
                        ) : bestItem ? (
                            <div className="space-y-4">
                                <div className="flex flex-col">
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none uppercase truncate">
                                        {formatLabel(bestItem.key)}
                                    </h2>
                                    <span className="text-xs font-black text-emerald-400 mt-1 uppercase tracking-widest">
                                        {formatCurrency(bestItem.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase">PEAK</span>
                                </div>
                            </div>
                        ) : <p className="text-slate-500 font-black text-sm uppercase">N/A</p>}
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-100 rounded-[32px] shadow-sm overflow-hidden flex flex-col justify-center">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analysis Mode</span>
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <PieChart className="w-4 h-4 text-blue-500" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {['day', 'roomType', 'room', 'hotel'].map((g) => (
                                <button
                                    key={g}
                                    className={cn(
                                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest border rounded-lg transition-all",
                                        groupBy === g ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                                    )}
                                    onClick={() => setGroupBy(g as any)}
                                >
                                    {g === 'roomType' ? 'Type' : g}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ERROR DISPLAY */}
            {isError && (
                <Alert variant="destructive" className="rounded-[24px] border-rose-100 bg-rose-50 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm"><AlertCircle className="w-6 h-6 text-rose-500" /></div>
                            <div className="space-y-1">
                                <AlertTitle className="text-sm font-black text-rose-900 uppercase tracking-tighter">Sync Denied</AlertTitle>
                                <AlertDescription className="text-xs font-bold text-rose-600/70">{extractErrorMessage(error)}</AlertDescription>
                            </div>
                        </div>
                        <Button variant="outline" className="h-10 px-6 rounded-xl border-rose-200 text-rose-700 bg-white font-black text-[10px] uppercase tracking-widest" onClick={() => refetch()}>
                            Re-establish Sync
                        </Button>
                    </div>
                </Alert>
            )}

            {/* REVENUE BREAKDOWN */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-slate-400" />
                        {groupBy === 'day' ? t('financials.daily_revenue') : t(`financials.revenue_by_${groupBy}`)}
                    </h2>
                    <Button variant="ghost" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl px-4">
                        PDF Audit Report
                    </Button>
                </div>

                <div className="space-y-3">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
                    ) : data?.items && data.items.length > 0 ? (
                        data.items.map((item: RevenueSummaryItemDto) => {
                            const share = data.totalRevenue > 0 ? (item.revenue / data.totalRevenue) * 100 : 0;
                            return (
                                <Card key={item.key} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white active:scale-[0.99] transition-all group">
                                    <CardContent className="p-4 sm:p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-slate-900 group-hover:border-slate-900 transition-all">
                                                    {groupBy === 'day' ? <CalendarDays className="w-4 h-4 text-slate-400 group-hover:text-white" /> :
                                                        groupBy === 'room' ? <Bed className="w-4 h-4 text-slate-400 group-hover:text-white" /> :
                                                            <Building2 className="w-4 h-4 text-slate-400 group-hover:text-white" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 uppercase text-xs tracking-tight">{formatLabel(item.key)}</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {share.toFixed(1)}% of period capture
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-slate-900 tracking-tighter">
                                                    {formatCurrency(item.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                </p>
                                                <div className="flex items-center justify-end gap-1 text-[8px] font-black text-emerald-600 uppercase">
                                                    <TrendingUp className="w-2.5 h-2.5" /> Stable
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative pt-4">
                                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                <div
                                                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-1000"
                                                    style={{ width: maxRevenue > 0 ? `${(item.revenue / maxRevenue) * 100}%` : '0%' }}
                                                />
                                            </div>
                                            {item.revenue === maxRevenue && (
                                                <Badge className="absolute -top-1 right-0 bg-slate-900 text-white font-black text-[7px] uppercase tracking-widest px-2 py-0 border-none shadow-lg">
                                                    Peak Output
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        <div className="py-24 text-center flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                            <div className="p-8 bg-white rounded-full shadow-inner opacity-60">
                                <BarChart3 className="w-12 h-12 text-slate-200" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {t('financials.no_data_for_range', 'No Revenue Capture')}
                                </h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter opacity-60">
                                    Revenue records or forecasts are missing for this period.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* DETAILED SUMMARY TABLE (DESKTOP) */}
            {!isLoading && data?.items && data.items.length > 0 && (
                <div className="hidden lg:block space-y-4 pt-8">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter px-2">Detailed Integrity Audit</h2>
                    <div className="rounded-[28px] border border-slate-100 bg-white overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead className="bg-slate-50/50">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <th className="py-5 px-8 text-left">{t('financials.date')} / Segment</th>
                                    <th className="py-5 text-right">Raw Earnings</th>
                                    <th className="py-5 px-8 text-right">Relative Weight</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.items.map((item: RevenueSummaryItemDto) => {
                                    const share = data.totalRevenue > 0 ? ((item.revenue / data.totalRevenue) * 100).toFixed(1) : '0.0';
                                    return (
                                        <tr key={item.key} className="hover:bg-slate-50/50 transition-all group">
                                            <td className="py-4 px-8 font-black text-slate-900 uppercase text-xs tracking-tight">
                                                {formatLabel(item.key)}
                                            </td>
                                            <td className="py-4 text-right font-black text-slate-700 tracking-tighter">
                                                {formatCurrency(item.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                            </td>
                                            <td className="py-4 px-8 text-right">
                                                <span className="inline-flex px-2 py-0.5 rounded-lg bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest">
                                                    {share}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-slate-900 border-t-0">
                                <tr className="text-white">
                                    <td className="py-5 px-8 font-black uppercase text-xs tracking-widest">Aggregate Capture</td>
                                    <td className="py-5 text-right font-black text-xl tracking-tighter text-emerald-400">
                                        {formatCurrency(data.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                    </td>
                                    <td className="py-5 px-8 text-right font-black text-[9px] uppercase tracking-widest text-slate-500">100.0%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Financials;
