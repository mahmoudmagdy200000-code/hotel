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
import { Badge } from '@/components/ui/badge';
import { useReceptionRoomsStatus } from '../hooks/useReceptionRoomsStatus';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Bed, User, Calendar, Hotel } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface RoomsStatusViewProps {
    date: string;
}

const RoomsStatusView: React.FC<RoomsStatusViewProps> = ({ date }) => {
    const { t } = useTranslation();
    const { data, isLoading, isError, error } = useReceptionRoomsStatus(date);
    const [filter, setFilter] = useState<'All' | 'Available' | 'Reserved' | 'Occupied'>('All');

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-20 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                </div>
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    if (isError) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('common.error')}</AlertTitle>
                <AlertDescription>
                    {error instanceof Error ? error.message : "Failed to load rooms status"}
                </AlertDescription>
            </Alert>
        );
    }

    const filteredItems = data?.items.filter(item => {
        if (filter === 'All') return true;
        return item.status === filter;
    }) || [];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Available':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{t('reception.available', 'Available')}</Badge>;
            case 'Reserved':
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{t('reception.reserved', 'Reserved')}</Badge>;
            case 'Occupied':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('reception.occupied', 'Occupied')}</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {(['All', 'Available', 'Reserved', 'Occupied'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-all border",
                            filter === f
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        )}
                    >
                        {t(`reception.filter_${f.toLowerCase()}`, f)}
                        {f === 'All' ? '' : (
                            <span className="ms-1.5 text-xs opacity-70">
                                {data?.items.filter(i => i.status === f).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[100px]">{t('reception.room_number', 'Room #')}</TableHead>
                            <TableHead>{t('reception.room_type', 'Type')}</TableHead>
                            <TableHead>{t('reception.status', 'Status')}</TableHead>
                            <TableHead>{t('reception.guest_stay', 'Guest / Stay')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <TableRow key={item.roomId} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-semibold text-slate-900">
                                        <div className="flex items-center gap-2">
                                            <Bed className="h-4 w-4 text-slate-400" />
                                            {item.roomNumber}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-slate-600 font-medium">{item.roomTypeName}</span>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(item.status)}
                                    </TableCell>
                                    <TableCell>
                                        {item.reservation ? (
                                            <div className="space-y-1 py-1">
                                                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                                                    <User className="h-3.5 w-3.5 text-slate-400" />
                                                    {item.reservation.guestName}
                                                </div>
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {item.reservation.checkIn} → {item.reservation.checkOut}
                                                    </div>
                                                    {item.reservation.hotelName && (
                                                        <div className="flex items-center gap-1 italic">
                                                            <Hotel className="h-3 w-3" />
                                                            {item.reservation.hotelName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">—</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                                    {t('common.no_results', 'No rooms found matching this filter.')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default RoomsStatusView;
