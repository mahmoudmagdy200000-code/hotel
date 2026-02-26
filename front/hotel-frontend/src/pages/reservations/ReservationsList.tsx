import { useState, useRef, useCallback, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
    Hotel
} from 'lucide-react';
import { ReservationStatus } from '@/api/types/reservations';
import type { ReservationDto } from '@/api/types/reservations';
import { cn, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/reservation/StatusBadge';





import { useBusinessDate } from '@/app/providers/BusinessDateProvider';

const ReservationsList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { businessDate } = useBusinessDate();

    // Filters
    const [status, setStatus] = useState<ReservationStatus | 'all'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
        from: new Date(businessDate),
        to: undefined
    }));
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data: reservations, isLoading, isError, error, refetch } = useReservationsList({
        status: status === 'all' ? undefined : status,
        from: fromDate || undefined,
        to: toDate || undefined,
        searchTerm: debouncedSearch || undefined,
        includeLines: true
    });

    return (
        <div className="space-y-6">
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
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <Filter className="w-7 h-7 opacity-30" />
                        </div>
                        <span className="font-bold text-sm text-slate-500 mb-1">{t('reservations.no_results', 'No results found')}</span>
                        <span className="text-xs text-slate-400 mb-5">{t('reservations.try_different_filter', 'Try adjusting your filters or search term')}</span>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-xl text-[10px] font-bold uppercase tracking-widest border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => navigate('/reception/today')}
                            >
                                <Hotel className="w-3.5 h-3.5 me-1.5" />
                                {t('reservations.quick_today', "Today's Arrivals")}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-xl text-[10px] font-bold uppercase tracking-widest border-slate-200 text-slate-600 hover:bg-slate-50"
                                onClick={() => navigate('/reservations/new')}
                            >
                                <Plus className="w-3.5 h-3.5 me-1.5" />
                                {t('reservations.new', 'New Reservation')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Mobile: List Cards (Virtualized when > 50 items) */}
                        <MobileCardList reservations={reservations ?? []} navigate={navigate} t={t} />

                        {/* Desktop: Premium Table (Virtualized when > 50 items) */}
                        <DesktopTable reservations={reservations ?? []} navigate={navigate} t={t} />
                    </>
                )}
            </div>

            {/* Floating Action Button (Mobile) */}
            <Button
                onClick={() => navigate('/reservations/new')}
                className="sm:hidden fixed bottom-24 right-4 h-14 w-14 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/20 active:scale-95 transition-all z-40 border-4 border-white/10"
                size="icon"
            >
                <Plus className="w-7 h-7" />
            </Button>
        </div>
    );
};

export default ReservationsList;


// ─── Virtualized Sub-Components ─────────────────────────────────
// Render normally if ≤ 50 items, virtualize if > 50 to cap DOM nodes.

const VIRTUALIZE_THRESHOLD = 50;
const MOBILE_CARD_HEIGHT = 140; // estimated px per card
const DESKTOP_ROW_HEIGHT = 56;  // estimated px per table row



interface ListProps {
    reservations: ReservationDto[];
    navigate: (path: string) => void;
    t: TFunction;
}

function MobileCardList({ reservations, navigate, t }: ListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const shouldVirtualize = reservations.length > VIRTUALIZE_THRESHOLD;

    const virtualizer = useVirtualizer({
        count: reservations.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => MOBILE_CARD_HEIGHT,
        overscan: 5,
        enabled: shouldVirtualize,
    });

    const renderCard = useCallback((res: ListProps['reservations'][0]) => (
        <div
            key={res.id}
            className={cn(
                "bg-white border border-slate-100 rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all hover:border-blue-200 group relative overflow-hidden",
                res.totalAmount === 0 && "border-l-4 border-l-amber-400"
            )}
            onClick={() => navigate(`/reservations/${res.id}`)}
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-black text-slate-900 text-base truncate uppercase tracking-tight leading-tight flex-1">
                    {res.guestName}
                </h3>
                <StatusBadge status={res.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <Hash className="w-3 h-3 opacity-60" />
                    <span>{res.bookingNumber || t('pending')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600/70">
                    <CalendarDays className="w-3 h-3 opacity-60" />
                    <span>
                        {format(parseISO(res.checkInDate), 'MMM d')} → {format(parseISO(res.checkOutDate), 'MMM d')}
                    </span>
                </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className={cn(
                    "font-black text-sm",
                    res.totalAmount === 0 ? "text-rose-500" : "text-slate-900"
                )}>
                    {res.totalAmount === 0 ? t('reservations.no_price', 'Price not set') : formatCurrency(res.totalAmount, res.currency)}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-500 transition-colors" />
            </div>
            {res.totalAmount === 0 && (
                <div className="mt-2.5 py-1.5 px-2.5 bg-amber-50 rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span className="text-[9px] font-black text-amber-700 uppercase tracking-tight">{t('reservations.missing_price')}</span>
                </div>
            )}
        </div>
    ), [navigate, t]);

    if (!shouldVirtualize) {
        return (
            <div className="grid grid-cols-1 gap-4 px-2 sm:px-0 sm:hidden">
                {reservations.map(renderCard)}
            </div>
        );
    }

    return (
        <div ref={parentRef} className="sm:hidden overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const res = reservations[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.key}
                            style={{
                                position: 'absolute',
                                top: virtualRow.start,
                                left: 0,
                                right: 0,
                                padding: '0 0 16px 0',
                            }}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                        >
                            {renderCard(res)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function DesktopTable({ reservations, navigate, t }: ListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const shouldVirtualize = reservations.length > VIRTUALIZE_THRESHOLD;

    const virtualizer = useVirtualizer({
        count: reservations.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => DESKTOP_ROW_HEIGHT,
        overscan: 10,
        enabled: shouldVirtualize,
    });

    const renderRow = useCallback((res: ListProps['reservations'][0]) => (
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
    ), [navigate, t]);

    if (!shouldVirtualize) {
        return (
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
                        {reservations.map(renderRow)}
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
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
            </Table>
            <div ref={parentRef} style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                    <Table>
                        <TableBody>
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const res = reservations[virtualRow.index];
                                return (
                                    <tr
                                        key={virtualRow.key}
                                        ref={virtualizer.measureElement}
                                        data-index={virtualRow.index}
                                        style={{
                                            position: 'absolute',
                                            top: virtualRow.start,
                                            left: 0,
                                            right: 0,
                                            display: 'table-row',
                                        }}
                                        className={cn(
                                            "cursor-pointer group hover:bg-blue-50/30 transition-all border-b border-slate-100",
                                            res.totalAmount === 0 && "bg-amber-50/30 hover:bg-amber-50/50"
                                        )}
                                        onClick={() => navigate(`/reservations/${res.id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-900 uppercase tracking-tight">{res.guestName}</div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{res.phone || t('no_phone')}</div>
                                        </td>
                                        <td className="py-4">
                                            <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600">
                                                {res.bookingNumber || '—'}
                                            </span>
                                        </td>
                                        <td className="py-4 text-xs font-bold text-slate-600">{res.checkInDate}</td>
                                        <td className="py-4 text-xs font-bold text-slate-600">{res.checkOutDate}</td>
                                        <td className="py-4"><StatusBadge status={res.status} /></td>
                                        <td className="py-4 text-right">
                                            <div className={cn(
                                                "font-black text-sm",
                                                res.totalAmount === 0 ? "text-rose-500" : "text-slate-900"
                                            )}>
                                                {res.totalAmount === 0 ? t('reservations.no_price') : formatCurrency(res.totalAmount, res.currency)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-blue-500 transition-all group-hover:translate-x-1 inline-block" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
