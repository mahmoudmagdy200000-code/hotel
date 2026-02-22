import { useState, useMemo } from 'react';
import type { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReservationsList } from '@/hooks/reservations/useReservationsList';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search,
    Filter,
    ChevronRight,
    Plus,
    AlertCircle,
    Hash,
    CalendarDays,
    RefreshCw,
    Briefcase,
    Zap,
    LayoutGrid,
    User,
    DollarSign,
    CheckCircle2,
    XCircle,
    Archive
} from 'lucide-react';
import { ReservationStatus } from '@/api/types/reservations';
import { cn, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/reservation/StatusBadge';

/**
 * Ras Sedr Rental - Global Reservations Ledger
 * High-density management for all stay cycles, from draft extraction to final checkout.
 */

const ReservationsList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Filters
    const [status, setStatus] = useState<ReservationStatus | 'all'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

    const { data: reservations, isLoading, isError, error, refetch, isFetching } = useReservationsList({
        status: status === 'all' ? undefined : status,
        from: fromDate || undefined,
        to: toDate || undefined,
        searchTerm: searchTerm || undefined,
        includeLines: true
    });

    const stats = useMemo(() => {
        if (!reservations) return { total: 0, drafts: 0, active: 0, pending: 0 };
        return {
            total: reservations.length,
            drafts: reservations.filter(r => r.status === ReservationStatus.Draft).length,
            active: reservations.filter(r => [ReservationStatus.CheckedIn, ReservationStatus.Confirmed].includes(r.status)).length,
            issues: reservations.filter(r => r.totalAmount === 0).length
        };
    }, [reservations]);

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* STICKY ACTION BAR */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <Briefcase className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('reservations.title')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-blue-500'}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {stats.total} {t('common.total', 'Registered Units')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => navigate('/reservations/new')}
                                className="hidden sm:flex h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4 me-1.5" />
                                {t('reservations.new')}
                            </Button>
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
                        <div className="relative group flex-1 w-full sm:w-auto">
                            <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                placeholder={t('common.search_placeholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-10 bg-white border border-slate-100 rounded-xl pl-9 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-inner"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-40 h-10">
                                <Filter className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <select
                                    className="w-full h-full pl-8 pr-4 rounded-xl border border-slate-100 bg-white shadow-inner text-[10px] font-black uppercase tracking-widest bg-transparent focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer appearance-none"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value === 'all' ? 'all' : Number(e.target.value) as ReservationStatus)}
                                >
                                    <option value="all">{t('common.all_statuses')}</option>
                                    <option value={ReservationStatus.Draft}>Drafts</option>
                                    <option value={ReservationStatus.Confirmed}>Confirmed</option>
                                    <option value={ReservationStatus.CheckedIn}>Inhouse</option>
                                    <option value={ReservationStatus.CheckedOut}>Archive</option>
                                    <option value={ReservationStatus.Cancelled}>Cancelled</option>
                                </select>
                            </div>
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={setDateRange}
                                className="flex-1 sm:w-auto h-10"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                    title="Gross Ledger"
                    value={stats.total}
                    icon={<Archive className="w-4 h-4 text-slate-600" />}
                    bg="bg-slate-100"
                />
                <MetricCard
                    title="Live Stays"
                    value={stats.active}
                    icon={<Zap className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-100"
                />
                <MetricCard
                    title="Draft Pipeline"
                    value={stats.drafts}
                    icon={<LayoutGrid className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-100"
                />
                <MetricCard
                    title="Pricing Issues"
                    value={stats.issues}
                    icon={<DollarSign className="w-4 h-4 text-rose-600" />}
                    bg="bg-rose-100"
                    isAlert={stats.issues > 0}
                />
            </div>

            {/* MAIN LISTING */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-[32px]" />)}
                    </div>
                ) : isError ? (
                    <Alert variant="destructive" className="rounded-[32px] border-rose-100 bg-rose-50 p-8 shadow-sm">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-white rounded-full shadow-sm"><AlertCircle className="w-8 h-8 text-rose-500" /></div>
                            <div className="space-y-1">
                                <AlertTitle className="text-sm font-black text-rose-900 uppercase tracking-tighter">Sync Denied</AlertTitle>
                                <AlertDescription className="text-xs font-bold text-rose-600/70">{extractErrorMessage(error)}</AlertDescription>
                            </div>
                            <Button variant="outline" className="mt-2 border-rose-200" onClick={() => refetch()}>Force Refresh</Button>
                        </div>
                    </Alert>
                ) : reservations?.length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                        <div className="p-8 bg-white rounded-full shadow-inner opacity-60">
                            <Briefcase className="w-12 h-12 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('reservations.no_results')}</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter opacity-60">No stay records match your active filter criteria.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: HIGH-DENSITY LEDGER CARDS */}
                        <div className="grid grid-cols-1 gap-4 sm:hidden">
                            {reservations?.map((res) => (
                                <div
                                    key={res.id}
                                    className={cn(
                                        "bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm active:scale-[0.99] transition-all group relative",
                                        res.totalAmount === 0 && "border-l-[6px] border-l-amber-500"
                                    )}
                                    onClick={() => navigate(`/reservations/${res.id}`)}
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="space-y-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-black text-slate-900 text-sm truncate uppercase tracking-tighter">
                                                        {res.guestName}
                                                    </h3>
                                                    <StatusBadge status={res.status} />
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <Hash className="w-3 h-3 text-slate-300" />
                                                        <span>{res.bookingNumber || 'DRAFT-ID'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className={cn(
                                                    "text-sm font-black tracking-tighter",
                                                    res.totalAmount === 0 ? "text-rose-500" : "text-slate-900"
                                                )}>
                                                    {res.totalAmount === 0 ? "PRICE UNSET" : formatCurrency(res.totalAmount, res.currency)}
                                                </p>
                                                {res.totalAmount === 0 && (
                                                    <span className="text-[8px] font-black text-amber-500 uppercase">Attention Required</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-[10px] font-black text-slate-700 tracking-tighter">
                                                    {format(parseISO(res.checkInDate), 'MMM d')} → {format(parseISO(res.checkOutDate), 'MMM d')}
                                                </span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-all" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* DESKTOP: PREMIUM LEDGER TABLE */}
                        <div className="hidden sm:block rounded-[32px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                        <TableHead className="px-8 py-5">Guest Perspective</TableHead>
                                        <TableHead className="py-5">Audit Identity</TableHead>
                                        <TableHead className="py-5 text-center">Lifecycle</TableHead>
                                        <TableHead className="py-5 pr-8 text-right">Settlement</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reservations?.map((res) => (
                                        <TableRow
                                            key={res.id}
                                            className={cn(
                                                "cursor-pointer group hover:bg-slate-50/80 transition-all",
                                                res.totalAmount === 0 && "bg-amber-50/30"
                                            )}
                                            onClick={() => navigate(`/reservations/${res.id}`)}
                                        >
                                            <TableCell className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all flex items-center justify-center">
                                                        <User className="w-4 h-4 text-slate-400 group-hover:text-white" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{res.guestName}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            PH: {res.phone || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter bg-slate-100 px-2 py-0.5 rounded-lg w-fit">
                                                        {res.bookingNumber || 'PENDING'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-widest">
                                                        <CalendarDays className="w-3 h-3 text-blue-500" />
                                                        {res.checkInDate} / {res.checkOutDate}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 text-center">
                                                <StatusBadge status={res.status} />
                                            </TableCell>
                                            <TableCell className="py-5 pr-8 text-right">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className={cn(
                                                        "text-base font-black tracking-tighter transition-all group-hover:scale-105",
                                                        res.totalAmount === 0 ? "text-rose-500" : "text-slate-900"
                                                    )}>
                                                        {res.totalAmount === 0 ? "SET PRICE" : formatCurrency(res.totalAmount, res.currency)}
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            {/* FLOATING ACTION BUTTON (MOBILE) */}
            <Button
                onClick={() => navigate('/reservations/new')}
                className="sm:hidden fixed bottom-24 right-6 h-14 w-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-900/40 active:scale-95 transition-all z-40 border-4 border-white/20"
                size="icon"
            >
                <Plus className="w-7 h-7" />
            </Button>
        </div>
    );
};

const MetricCard = ({ title, value, icon, bg, isAlert }: { title: string, value: number, icon: React.ReactNode, bg: string, isAlert?: boolean }) => (
    <Card className={cn(
        "border border-slate-100 shadow-sm transition-all active:scale-[0.98] group rounded-[32px] overflow-hidden bg-white",
        isAlert && "bg-rose-50/50 border-rose-100"
    )}>
        <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <div className={cn("p-1.5 rounded-xl transition-all", bg)}>{icon}</div>
            </div>
            <h3 className={cn(
                "text-2xl font-black text-slate-900 leading-none tracking-tighter",
                isAlert && value > 0 && "text-rose-600"
            )}>{value}</h3>
        </CardContent>
    </Card>
);

export default ReservationsList;
