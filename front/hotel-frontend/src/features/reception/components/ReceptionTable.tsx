import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, ChevronRight, Phone, CalendarDays, Hash, LogIn, LogOut } from 'lucide-react';
import type { ReceptionReservationItemDto } from '@/api/types/reception';

interface ReceptionTableProps {
    data: ReceptionReservationItemDto[];
    emptyMessage: string;
    onAction: (type: 'check-in' | 'check-out' | 'cancel' | 'confirm' | 'no-show', reservation: ReceptionReservationItemDto) => void;
}

const StatusBadge = ({ status }: { status: string }) => {
    let style = "bg-slate-50 text-slate-400 border-slate-100";

    switch (status.toLowerCase()) {
        case 'confirmed':
            style = "bg-blue-50 text-blue-600 border-blue-100";
            break;
        case 'draft':
            style = "bg-slate-100 text-slate-600 border-slate-200";
            break;
        case 'checkedin':
            style = "bg-emerald-50 text-emerald-600 border-emerald-100";
            break;
        case 'checkedout':
            style = "bg-purple-50 text-purple-600 border-purple-100";
            break;
        case 'cancelled':
        case 'noshow':
            style = "bg-rose-50 text-rose-600 border-rose-100";
            break;
    }

    return (
        <span className={`inline-flex px-1.5 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-widest border ${style}`}>
            {status}
        </span>
    );
};

const ReceptionTable = ({ data, emptyMessage, onAction }: ReceptionTableProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (data.length === 0) {
        return (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                    <CalendarDays className="w-8 h-8 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Mobile: List Cards */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
                {data.map((item) => (
                    <div
                        key={item.reservationId}
                        className="bg-white border border-slate-100 rounded-[12px] p-4 shadow-sm active:scale-[0.98] transition-all hover:border-blue-200 group"
                        onClick={() => navigate(`/reception/reservations/${item.reservationId}`)}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                                        {item.guestName}
                                    </h3>
                                    <StatusBadge status={item.status} />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                        <Hash className="w-3 h-3" />
                                        <span>{item.bookingNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                        <CalendarDays className="w-3 h-3 text-blue-500" />
                                        <span>{item.checkIn} → {item.checkOut}</span>
                                    </div>
                                    {item.phone && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                            <Phone className="w-3 h-3" />
                                            <span>{item.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                {item.status === 'Confirmed' || item.status === 'Draft' ? (
                                    <Button
                                        size="icon"
                                        className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAction('check-in', item);
                                        }}
                                    >
                                        <LogIn className="w-5 h-5" />
                                    </Button>
                                ) : item.status === 'CheckedIn' ? (
                                    <Button
                                        size="icon"
                                        className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAction('check-out', item);
                                        }}
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </Button>
                                ) : (
                                    <div className="h-10 w-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-300">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop: Premium Table */}
            <div className="hidden sm:block rounded-[12px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-tighter border-b border-slate-100">
                            <TableHead className="py-4 px-6">{t('reception.guest_name', 'Guest')}</TableHead>
                            <TableHead className="py-4 px-4">{t('reception.booking_number', 'Booking #')}</TableHead>
                            <TableHead className="py-4 px-4">{t('reception.checkin', 'Check In')}</TableHead>
                            <TableHead className="py-4 px-4">{t('reception.checkout', 'Check Out')}</TableHead>
                            <TableHead className="py-4 px-4">{t('reception.status', 'Status')}</TableHead>
                            <TableHead className="py-4 px-4">{t('reception.rooms', 'Rooms')}</TableHead>
                            <TableHead className="py-4 px-6 text-right">{t('common.actions', 'Actions')}</TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.reservationId} className="hover:bg-blue-50/30 transition-all group">
                                <TableCell className="py-4 px-6">
                                    <div className="font-black text-slate-900 uppercase tracking-tight">{item.guestName}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-0.5">{item.phone || 'No phone'}</div>
                                </TableCell>
                                <TableCell className="py-4 px-4 font-bold text-slate-500 text-xs">
                                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">{item.bookingNumber}</span>
                                </TableCell>
                                <TableCell className="py-4 px-4 font-bold text-slate-600 text-xs">{item.checkIn}</TableCell>
                                <TableCell className="py-4 px-4 font-bold text-slate-400 text-xs">{item.checkOut}</TableCell>
                                <TableCell className="py-4 px-4">
                                    <StatusBadge status={item.status} />
                                </TableCell>
                                <TableCell className="py-4 px-4">
                                    <div className="text-xs font-black text-slate-900">
                                        {item.roomNumbers && item.roomNumbers.length > 0 ? item.roomNumbers.join(', ') : '—'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]" title={item.roomTypeNames?.join(', ')}>
                                        {item.roomTypeNames && item.roomTypeNames.length > 0 ? item.roomTypeNames.join(', ') : '—'}
                                    </div>
                                </TableCell>
                                <TableCell className="py-4 px-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                                            onClick={() => navigate(`/reception/reservations/${item.reservationId}`)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>

                                        {(item.status === 'Confirmed' || item.status === 'Draft') && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-4"
                                                    onClick={() => onAction('check-in', item)}
                                                >
                                                    {t('reception.check_in')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest"
                                                    onClick={() => onAction('no-show', item)}
                                                >
                                                    {t('reception.no_show')}
                                                </Button>
                                            </>
                                        )}

                                        {item.status === 'CheckedIn' && (
                                            <Button
                                                size="sm"
                                                className="h-8 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-4"
                                                onClick={() => onAction('check-out', item)}
                                            >
                                                {t('reception.check_out')}
                                            </Button>
                                        )}

                                        {(item.status === 'Draft' || item.status === 'Pending') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 border-slate-200 font-black text-[10px] uppercase tracking-widest"
                                                onClick={() => onAction('confirm', item)}
                                            >
                                                {t('reception.confirm')}
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default ReceptionTable;
