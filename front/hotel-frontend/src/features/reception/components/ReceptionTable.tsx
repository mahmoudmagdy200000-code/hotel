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
import { Eye, Bed, AlertCircle } from 'lucide-react';
import type { ReceptionReservationItemDto } from '@/api/types/reception';

import { ReservationCompactCard } from './ReservationCompactCard';

/**
 * Ras Sedr Rental - Reception Operation Table
 * Universal component for tracking guest flow with high-impact mobile cards and premium desktop views.
 */

interface ReceptionTableProps {
    data: ReceptionReservationItemDto[];
    emptyMessage: string;
    onAction: (type: 'check-in' | 'check-out' | 'cancel' | 'confirm' | 'no-show', reservation: ReceptionReservationItemDto) => void;
}

const ReceptionTable = ({ data, emptyMessage, onAction }: ReceptionTableProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                <div className="p-8 bg-white rounded-full shadow-inner opacity-60">
                    <AlertCircle className="w-12 h-12 text-slate-200" />
                </div>
                <div className="space-y-1 text-center mt-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{emptyMessage}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter opacity-60">No operations pending for this category.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* MOBILE: HIGH-DENSITY COMPACT LIST */}
            <div className="grid grid-cols-1 md:hidden pb-4 divide-y divide-slate-100 bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                {data.map((item) => (
                    <ReservationCompactCard
                        key={item.reservationId}
                        item={item}
                        onAction={onAction}
                    />
                ))}
            </div>

            {/* DESKTOP: PREMIUM OPERATIONAL TABLE */}
            <div className="hidden sm:block rounded-[32px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 text-[10px]">
                            <TableHead className="py-5 px-8">{t('reception.guest_name')}</TableHead>
                            <TableHead className="py-5 px-4">{t('reception.booking_number')}</TableHead>
                            <TableHead className="py-5 px-4">Temporal Range</TableHead>
                            <TableHead className="py-5 px-4 text-center">{t('reception.room_types')}</TableHead>
                            <TableHead className="py-5 px-4">{t('reception.rooms')}</TableHead>
                            <TableHead className="py-5 px-8 text-right">{t('actions')}</TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.reservationId} className="hover:bg-slate-50/50 transition-all group">
                                <TableCell className="py-5 px-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-slate-900/10">
                                            {item.guestName.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 uppercase tracking-tight text-sm">{item.guestName}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.phone || 'No Contact'}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 px-4">
                                    <span className="bg-slate-100/80 px-2 py-1 rounded-lg text-slate-600 font-black text-[10px] uppercase tracking-tighter shadow-sm border border-slate-200/50">
                                        {item.bookingNumber}
                                    </span>
                                </TableCell>
                                <TableCell className="py-5 px-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-slate-900 tracking-tighter">{item.checkIn}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">to {item.checkOut}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 px-4 text-center">
                                    <div className="bg-slate-100 text-slate-600 font-black text-[10px] px-2 py-1 rounded-lg border border-slate-200 uppercase tracking-tighter inline-block">
                                        {item.roomTypeNames?.join(', ') || 'Unassigned'}
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 px-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 rounded-lg">
                                            <Bed className="w-3.5 h-3.5 text-blue-500" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-slate-900 tracking-tighter">
                                                {item.roomNumbers && item.roomNumbers.length > 0 ? item.roomNumbers.join(', ') : 'Unassigned'}
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[140px] tracking-tighter">
                                                {item.roomTypeNames?.join(', ') || 'Incomplete'}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5 px-8 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-300 hover:text-slate-900 transition-all"
                                            onClick={() => navigate(`/reception/reservations/${item.reservationId}`)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>

                                        {(item.status === 'Confirmed' || item.status === 'Draft') && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-5 rounded-xl shadow-lg shadow-emerald-900/10 active:scale-95 transition-all"
                                                    onClick={() => onAction('check-in', item)}
                                                >
                                                    {t('reception.check_in')}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest rounded-xl"
                                                    onClick={() => onAction('no-show', item)}
                                                >
                                                    {t('reception.no_show')}
                                                </Button>
                                            </>
                                        )}

                                        {item.status === 'CheckedIn' && (
                                            <Button
                                                size="sm"
                                                className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-5 rounded-xl shadow-lg shadow-blue-900/10 active:scale-95 transition-all"
                                                onClick={() => onAction('check-out', item)}
                                            >
                                                {t('reception.check_out')}
                                            </Button>
                                        )}

                                        {(item.status === 'Draft' || item.status === 'Pending') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-9 border-slate-200 font-black text-[10px] uppercase tracking-widest rounded-xl"
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
