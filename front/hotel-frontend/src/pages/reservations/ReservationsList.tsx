import { useState } from 'react';
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
    RefreshCw
} from 'lucide-react';
import { ReservationStatus } from '@/api/types/reservations';
import { cn, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/reservation/StatusBadge';





const ReservationsList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Filters
    const [status, setStatus] = useState<ReservationStatus | 'all'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

    const { data: reservations, isLoading, isError, error, refetch } = useReservationsList({
        status: status === 'all' ? undefined : status,
        from: fromDate || undefined,
        to: toDate || undefined,
        searchTerm: searchTerm || undefined,
        includeLines: true
    });

    return (
        <div className="space-y-6 pb-20 sm:pb-0">
            {/* Header: Core Navigation & Status */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                        {t('reservations.title', 'Reservations')}
                    </h1>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                        {reservations?.length || 0} {t('total', 'Total')}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => navigate('/reservations/new')}
                        className="hidden sm:flex h-9 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-4 rounded-xl shadow-sm hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5 me-2" />
                        {t('reservations.new', 'New Reservation')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-slate-100 transition-transform active:scale-95 flex-shrink-0"
                        onClick={() => refetch()}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("h-4 w-4 text-slate-400", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Filters Bar: Compact & Collapsible-lite */}
            <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder={t('search_placeholder', 'Search guest or booking...')}
                            className="pl-9 h-10 rounded-xl border-slate-200 bg-white shadow-sm text-xs font-bold"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-40">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
                            <select
                                className="w-full h-10 pl-8 pr-4 rounded-xl border border-slate-200 bg-white shadow-sm text-[10px] font-black uppercase tracking-widest appearance-none focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                                value={status}
                                onChange={(e) => setStatus(e.target.value === 'all' ? 'all' : Number(e.target.value) as ReservationStatus)}
                            >
                                <option value="all">{t('all_statuses', 'All Statuses')}</option>
                                <option value={ReservationStatus.Draft}>{t('draft', 'Draft')}</option>
                                <option value={ReservationStatus.Confirmed}>{t('confirmed', 'Confirmed')}</option>
                                <option value={ReservationStatus.CheckedIn}>{t('check_in', 'In')}</option>
                                <option value={ReservationStatus.CheckedOut}>{t('check_out', 'Out')}</option>
                                <option value={ReservationStatus.Cancelled}>{t('cancelled', 'Cancelled')}</option>
                                <option value={ReservationStatus.NoShow}>{t('no_show', 'No Show')}</option>
                            </select>
                        </div>
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="flex-1 sm:w-auto"
                        />
                    </div>
                </div>
            </div>

            {/* List View: Mobile Cards / Desktop Table */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-3">
                        {Array(5).fill(0).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-rose-500 bg-rose-50/50 rounded-2xl border border-rose-100">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <span className="font-bold text-sm">{error instanceof Error ? error.message : t('error_loading')}</span>
                    </div>
                ) : reservations?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <Filter className="w-8 h-8 mb-2 opacity-20" />
                        <span className="font-bold text-xs uppercase tracking-widest">{t('reservations.no_results', 'No results found')}</span>
                    </div>
                ) : (
                    <>
                        {/* Mobile: List Cards */}
                        <div className="grid grid-cols-1 gap-3 sm:hidden">
                            {reservations?.map((res) => (
                                <div
                                    key={res.id}
                                    className={cn(
                                        "bg-white border border-slate-100 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all hover:border-blue-200 group relative overflow-hidden",
                                        res.totalAmount === 0 && "border-l-4 border-l-amber-400"
                                    )}
                                    onClick={() => navigate(`/reservations/${res.id}`)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                                                    {res.guestName}
                                                </h3>
                                                <StatusBadge status={res.status} />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                    <Hash className="w-3 h-3" />
                                                    <span>{res.bookingNumber || t('pending')}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600/80">
                                                    <CalendarDays className="w-3 h-3" />
                                                    <span>
                                                        {format(parseISO(res.checkInDate), 'MMM d')} → {format(parseISO(res.checkOutDate), 'MMM d')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            <div className={cn(
                                                "font-black text-xs",
                                                res.totalAmount === 0 ? "text-rose-500" : "text-slate-900"
                                            )}>
                                                {res.totalAmount === 0 ? t('reservations.no_price', 'Price not set') : formatCurrency(res.totalAmount, res.currency)}
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-500 transition-colors" />
                                        </div>
                                    </div>
                                    {res.totalAmount === 0 && (
                                        <div className="mt-2 py-1 px-2 bg-amber-50 rounded-lg flex items-center gap-1.5">
                                            <AlertCircle className="w-3 h-3 text-amber-600" />
                                            <span className="text-[9px] font-black text-amber-700 uppercase tracking-tight">{t('reservations.missing_price')}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Desktop: Premium Table */}
                        <div className="hidden sm:block rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-b border-slate-100 font-black text-[10px] uppercase tracking-tighter text-slate-400">
                                        <TableHead className="px-6 py-4">{t('reservations.guest', 'Guest')}</TableHead>
                                        <TableHead className="py-4">{t('reservations.booking_number', 'Booking #')}</TableHead>
                                        <TableHead className="py-4">{t('reservations.check_in', 'Check In')}</TableHead>
                                        <TableHead className="py-4">{t('reservations.check_out', 'Check Out')}</TableHead>
                                        <TableHead className="py-4">{t('reservations.status', 'Status')}</TableHead>
                                        <TableHead className="py-4 text-right">{t('reservations.total', 'Total')}</TableHead>
                                        <TableHead className="px-6 py-4 text-right"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reservations?.map((res) => (
                                        <TableRow
                                            key={res.id}
                                            className={cn(
                                                "cursor-pointer group hover:bg-blue-50/30 transition-all border-b border-slate-100",
                                                res.totalAmount === 0 && "bg-amber-50/30 hover:bg-amber-50/50"
                                            )}
                                            onClick={() => navigate(`/reservations/${res.id}`)}
                                        >
                                            <TableCell className="px-6 py-4">
                                                <div className="font-black text-slate-900 uppercase tracking-tight">{res.guestName}</div>
                                                <div className="text-[10px] font-bold text-slate-400 mt-0.5">{res.phone || t('no_phone')}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600">
                                                    {res.bookingNumber || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs font-bold text-slate-600">{res.checkInDate}</TableCell>
                                            <TableCell className="text-xs font-bold text-slate-600">{res.checkOutDate}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={res.status} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className={cn(
                                                    "font-black text-sm",
                                                    res.totalAmount === 0 ? "text-rose-500" : "text-slate-900"
                                                )}>
                                                    {res.totalAmount === 0 ? t('reservations.no_price') : formatCurrency(res.totalAmount, res.currency)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-blue-500 transition-all group-hover:translate-x-1 inline-block" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            {/* Floating Action Button (Mobile) */}
            <Button
                onClick={() => navigate('/reservations/new')}
                className="sm:hidden fixed bottom-20 right-4 h-14 w-14 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/20 active:scale-95 transition-all z-40 border-4 border-white/10"
                size="icon"
            >
                <Plus className="w-7 h-7" />
            </Button>
        </div>
    );
};

export default ReservationsList;
