import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';
import { format, startOfMonth, endOfMonth, parseISO, addMonths, subMonths, setMonth, setYear } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
    Card,
    CardContent,
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
    TrendingUp,
    Zap,
    PieChart,
    Receipt
} from 'lucide-react';
import { useRevenueSummary } from '@/hooks/dashboard';
import { formatCurrency, cn, extractErrorMessage } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CurrencyCodeEnum, CurrencyCodeLabels } from '@/api/types/reservations';
import type { GetRevenueSummaryParams, RevenueSummaryItemDto } from '@/api/types/dashboard';
import {
    getExpenseCategoryTranslationKey,
    getExpenseCategoryStyle
} from '@/api/types/expenses';

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

    const [showExpenditure, setShowExpenditure] = useState(false);

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
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-2 bg-slate-900 shadow-md sm:rounded-2xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-white/10 rounded-xl border border-white/5 backdrop-blur-xl">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-xs font-black text-white uppercase tracking-tight leading-none">
                                    {t('financials.title')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        {format(currentDate, 'MMMM yyyy', { locale: dateLocale })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 active:scale-[0.98]"
                                onClick={handleThisMonth}
                                title="Current Month"
                            >
                                <Zap className="h-3 w-3 text-amber-400" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-3 w-3 text-slate-400", isFetching && "animate-spin text-emerald-400")} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 shadow-inner h-8">
                            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7 rounded-md hover:bg-slate-100"><ChevronLeft className="w-3.5 h-3.5" /></Button>
                            <Select value={currentDate.getMonth().toString()} onValueChange={handleMonthSelect}>
                                <SelectTrigger className="h-7 border-none shadow-none font-bold text-[9px] uppercase tracking-widest w-[90px] focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={currentDate.getFullYear().toString()} onValueChange={handleYearSelect}>
                                <SelectTrigger className="h-7 border-none shadow-none font-bold text-[10px] w-[60px] focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7 rounded-md hover:bg-slate-100"><ChevronRight className="w-3.5 h-3.5" /></Button>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex flex-1 sm:flex-none p-0.5 bg-white/10 rounded-lg border border-white/5 h-8">
                                <button
                                    className={cn(
                                        "flex-1 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                                        mode === 'actual' ? "bg-white text-slate-900 shadow-sm" : "text-white/40 hover:text-white"
                                    )}
                                    onClick={() => setMode('actual')}
                                >
                                    {t('dashboard.actual')}
                                </button>
                                <button
                                    className={cn(
                                        "flex-1 px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                                        mode === 'forecast' ? "bg-white text-slate-900 shadow-sm" : "text-white/40 hover:text-white"
                                    )}
                                    onClick={() => setMode('forecast')}
                                >
                                    {t('dashboard.forecast')}
                                </button>
                            </div>

                            <div className="flex w-[80px]">
                                <Select value={selectedCurrency.toString()} onValueChange={(val) => handleCurrencyChange(parseInt(val, 10))}>
                                    <SelectTrigger className="h-8 border-none bg-white font-black text-[10px] uppercase tracking-tighter text-slate-900 shadow-inner rounded-lg focus:ring-0">
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
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <Card className="bg-emerald-600 border-none rounded-2xl shadow-sm overflow-hidden relative group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-12 h-12 text-white" />
                    </div>
                    <CardContent className="p-3 relative flex flex-col justify-between h-full">
                        <div>
                            <span className="text-[9px] font-black text-emerald-100 uppercase tracking-widest block mb-1">
                                {t('financials.total_revenue')}
                            </span>
                            {isLoading ? (
                                <Skeleton className="h-6 w-24 bg-emerald-500" />
                            ) : (
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                    <h2 className="text-xl font-black text-white tracking-tight leading-none">
                                        {data ? formatCurrency(data.totalRevenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels]) : '—'}
                                    </h2>
                                    <span className="text-[8px] font-black text-emerald-200 uppercase tracking-widest bg-emerald-700/50 px-1.5 py-0.5 rounded-md border border-white/10">
                                        {mode}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-[8px] font-bold text-emerald-200/60 mt-2 uppercase tracking-tight leading-tight hidden sm:block">
                            {mode === 'forecast' ? "Projected earnings." : "Realized income."}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-none rounded-2xl shadow-sm overflow-hidden relative group">
                    <CardContent className="p-3 flex flex-col justify-between h-full">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                Top Segment
                            </span>
                            {isLoading ? (
                                <Skeleton className="h-6 w-24 bg-slate-800" />
                            ) : bestItem ? (
                                <div className="flex flex-col">
                                    <h2 className="text-sm font-black text-white tracking-tight leading-none uppercase truncate">
                                        {formatLabel(bestItem.key)}
                                    </h2>
                                    <span className="text-[10px] font-black text-emerald-400 mt-1 uppercase tracking-widest">
                                        {formatCurrency(bestItem.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                    </span>
                                </div>
                            ) : <p className="text-slate-500 font-black text-[10px] uppercase">N/A</p>}
                        </div>

                        {bestItem && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                                </div>
                                <span className="text-[8px] font-black text-slate-500 uppercase">PEAK</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-center col-span-2 lg:col-span-1">
                    <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Analysis View</span>
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <PieChart className="w-3.5 h-3.5 text-blue-500" />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {['day', 'roomType', 'room', 'hotel'].map((g) => (
                                <button
                                    key={g}
                                    className={cn(
                                        "px-2.5 py-1 text-[8px] font-black uppercase tracking-widest border rounded-md transition-all flex-1 min-w-[50px] text-center",
                                        groupBy === g ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
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
                    <div className="flex items-center gap-4">
                        <button
                            className={cn(
                                "text-xl font-black uppercase tracking-tighter flex items-center gap-2 transition-all",
                                !showExpenditure ? "text-slate-900" : "text-slate-300 hover:text-slate-400"
                            )}
                            onClick={() => setShowExpenditure(false)}
                        >
                            <BarChart3 className="w-5 h-5" />
                            {groupBy === 'day' ? t('financials.daily_revenue') : t(`financials.revenue_by_${groupBy}`)}
                        </button>
                        <div className="w-px h-6 bg-slate-200" />
                        <button
                            className={cn(
                                "text-xl font-black uppercase tracking-tighter flex items-center gap-2 transition-all",
                                showExpenditure ? "text-slate-900" : "text-slate-300 hover:text-slate-400"
                            )}
                            onClick={() => setShowExpenditure(true)}
                        >
                            <Receipt className="w-5 h-5" />
                            Expenditure Breakdown
                        </button>
                    </div>
                    <Button variant="ghost" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl px-4">
                        PDF Audit Report
                    </Button>
                </div>

                <div className="space-y-2">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                    ) : !showExpenditure ? (
                        data?.items && data.items.length > 0 ? (
                            data.items.map((item: RevenueSummaryItemDto) => {
                                const share = data.totalRevenue > 0 ? (item.revenue / data.totalRevenue) * 100 : 0;
                                return (
                                    <Card key={item.key} className="border-slate-100 border rounded-xl overflow-hidden bg-white active:scale-[0.99] transition-all group shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                        <CardContent className="p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100 group-hover:bg-slate-900 group-hover:border-slate-900 transition-all">
                                                        {groupBy === 'day' ? <CalendarDays className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> :
                                                            groupBy === 'room' ? <Bed className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" /> :
                                                                <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-tight">{formatLabel(item.key)}</h3>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                                            {share.toFixed(1)}% of capture
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900 tracking-tighter leading-none">
                                                        {formatCurrency(item.revenue, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                    </p>
                                                    <div className="flex items-center justify-end gap-1 text-[8px] font-black text-emerald-600 uppercase mt-1">
                                                        <TrendingUp className="w-2 h-2" /> Stable
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative pt-2">
                                                <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-1000"
                                                        style={{ width: maxRevenue > 0 ? `${(item.revenue / maxRevenue) * 100}%` : '0%' }}
                                                    />
                                                </div>
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
                        )
                    ) : (
                        data?.byExpenseCategory && data.byExpenseCategory.length > 0 ? (
                            data.byExpenseCategory
                                .sort((a, b) => b.amount - a.amount)
                                .map((item) => {
                                    const style = getExpenseCategoryStyle(item.categoryId);
                                    const totalExpenses = data.byExpenseCategory.reduce((sum, i) => sum + i.amount, 0);
                                    const expenseShare = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
                                    const Icon = style.icon;

                                    return (
                                        <Card key={item.categoryId} className="border-slate-100 border rounded-xl overflow-hidden bg-white active:scale-[0.99] transition-all group shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                            <CardContent className="p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("p-1.5 rounded-lg border shadow-sm transition-all", style.bg, style.color, "group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900")}>
                                                            <Icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-tight">
                                                                {t(getExpenseCategoryTranslationKey(item.categoryId as any))}
                                                            </h3>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                                                {expenseShare.toFixed(1)}% of OpEx
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-rose-600 tracking-tighter leading-none">
                                                            {formatCurrency(item.amount, CurrencyCodeLabels[selectedCurrency as keyof typeof CurrencyCodeLabels])}
                                                        </p>
                                                        <div className="text-[8px] font-black text-slate-400 uppercase mt-1">
                                                            Categorized Burn
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="relative pt-2">
                                                    <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                        <div
                                                            className={cn("h-full transition-all duration-1000", style.bg.replace('bg-', 'bg-opacity-100 bg-').split(' ')[0])}
                                                            style={{
                                                                width: `${expenseShare}%`,
                                                                backgroundColor: 'currentColor'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })
                        ) : (
                            <div className="py-24 text-center flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                                <div className="p-8 bg-white rounded-full shadow-inner opacity-60">
                                    <Receipt className="w-12 h-12 text-slate-200" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        No Expenses Found
                                    </h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter opacity-60">
                                        No expenditures were recorded for this period.
                                    </p>
                                </div>
                            </div>
                        )
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
