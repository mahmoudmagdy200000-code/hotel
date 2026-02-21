import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useReceptionRoomsStatus } from '../hooks/useReceptionRoomsStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Bed, User, CalendarDays, Hotel, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RoomsStatusViewProps {
    date: string;
}

const StatusBadge = ({ status }: { status: string }) => {
    let style = "bg-slate-50 text-slate-400 border-slate-100";

    switch (status) {
        case 'Available':
            style = "bg-emerald-50 text-emerald-600 border-emerald-100";
            break;
        case 'Reserved':
            style = "bg-amber-50 text-amber-600 border-amber-100";
            break;
        case 'Occupied':
            style = "bg-blue-50 text-blue-600 border-blue-100";
            break;
    }

    return (
        <span className={`inline-flex px-1.5 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-widest border ${style}`}>
            {status}
        </span>
    );
};

const RoomsStatusView: React.FC<RoomsStatusViewProps> = ({ date }) => {
    const { t } = useTranslation();
    const { data, isLoading, isError, error } = useReceptionRoomsStatus(date);
    const [filter, setFilter] = useState<'All' | 'Available' | 'Reserved' | 'Occupied'>('All');

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-24 rounded-full" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
                <Skeleton className="hidden sm:block h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (isError) {
        return (
            <Alert variant="destructive" className="border-rose-200 bg-rose-50/50">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="font-black text-rose-700 uppercase tracking-widest text-[10px]">{t('common.error')}</AlertTitle>
                <AlertDescription className="text-xs text-rose-600">
                    {error instanceof Error ? error.message : "Failed to load rooms status"}
                </AlertDescription>
            </Alert>
        );
    }

    const filteredItems = data?.items.filter(item => {
        if (filter === 'All') return true;
        return item.status === filter;
    }) || [];

    return (
        <div className="space-y-4">
            {/* Filter Pills: Professional Navigation */}
            <div className="flex flex-wrap gap-2 sticky top-14 z-10 bg-white/80 backdrop-blur-sm py-2 -mx-4 px-4 sm:relative sm:top-auto sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0">
                {(['All', 'Available', 'Reserved', 'Occupied'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all border",
                            filter === f
                                ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                        )}
                    >
                        {t(`reception.filter_${f.toLowerCase()}`, f)}
                        {f !== 'All' && (
                            <span className={cn(
                                "ms-1.5 px-1 py-0.5 rounded text-[9px]",
                                filter === f ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                                {data?.items.filter(i => i.status === f).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Mobile: List Cards */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
                {filteredItems.map((item) => (
                    <div
                        key={item.roomId}
                        className="bg-white border border-slate-100 rounded-[12px] p-4 shadow-sm active:scale-[0.98] transition-all group"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm uppercase tracking-tight">
                                        <Bed className="h-3.5 w-3.5 text-slate-400" />
                                        {item.roomNumber}
                                    </div>
                                    <StatusBadge status={item.status} />
                                </div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                                    {item.roomTypeName}
                                </div>
                                {item.reservation && (
                                    <div className="pt-1.5 border-t border-slate-50 mt-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-tight">
                                            <User className="h-3 w-3 text-blue-500" />
                                            {item.reservation.guestName}
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 mt-0.5">
                                            <CalendarDays className="h-3 w-3 text-slate-300" />
                                            {item.reservation.checkIn} → {item.reservation.checkOut}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex-shrink-0">
                                <ChevronRight className="w-5 h-5 text-slate-200" />
                            </div>
                        </div>
                    </div>
                ))}
                {filteredItems.length === 0 && (
                    <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.no_results')}</p>
                    </div>
                )}
            </div>

            {/* Desktop: Premium Table */}
            <div className="hidden sm:block rounded-[12px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-tighter border-b border-slate-100">
                            <TableHead className="py-4 px-6">{t('reception.room_number', 'Room #')}</TableHead>
                            <TableHead className="py-4 px-4">{t('reception.room_type', 'Type')}</TableHead>
                            <TableHead className="py-4 px-4">{t('reception.status', 'Status')}</TableHead>
                            <TableHead className="py-4 px-6">{t('reception.guest_stay', 'Guest / Stay')}</TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.map((item) => (
                            <TableRow key={item.roomId} className="hover:bg-blue-50/30 transition-all group">
                                <TableCell className="py-4 px-6">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-white group-hover:text-blue-500 transition-colors">
                                            <Bed className="h-4 w-4" />
                                        </div>
                                        <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{item.roomNumber}</div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 px-2 py-1 rounded">{item.roomTypeName}</span>
                                </TableCell>
                                <TableCell className="py-4 px-4">
                                    <StatusBadge status={item.status} />
                                </TableCell>
                                <TableCell className="py-4 px-6">
                                    {item.reservation ? (
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-tight">
                                                <User className="h-3 w-3 text-blue-500" />
                                                {item.reservation.guestName}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                                <div className="flex items-center gap-1">
                                                    <CalendarDays className="h-3 w-3 text-slate-300" />
                                                    {item.reservation.checkIn} → {item.reservation.checkOut}
                                                </div>
                                                {item.reservation.hotelName && (
                                                    <div className="flex items-center gap-1">
                                                        <Hotel className="h-3 w-3 text-slate-300" />
                                                        {item.reservation.hotelName}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default RoomsStatusView;
