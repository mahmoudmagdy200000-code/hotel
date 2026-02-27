import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Hash, CalendarDays, Bed, LogIn, LogOut, Eye, AlertCircle } from 'lucide-react';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import { cn } from '@/lib/utils';

interface ReservationCompactCardProps {
    item: ReceptionReservationItemDto;
    onAction: (type: 'check-in' | 'check-out' | 'cancel' | 'confirm' | 'no-show', reservation: ReceptionReservationItemDto) => void;
}

/**
 * Ras Sedr Rental - Compact Reservation Card
 * Redesigned for maximum vertical economy (2 lines) on mobile devices.
 */
export const ReservationCompactCard = ({ item, onAction }: ReservationCompactCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Helper to extract mon/day from yyyy-mm-dd
    const formatShortDate = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[parseInt(parts[1]) - 1];
        return `${month} ${parts[2]}`;
    };

    const statusColor = item.status === 'CheckedIn' ? 'bg-blue-500' :
        item.status === 'Confirmed' ? 'bg-emerald-500' :
            item.status === 'CheckedOut' ? 'bg-slate-400' : 'bg-amber-500';

    return (
        <div
            className="bg-white border-b border-slate-100 p-3 active:bg-slate-50 transition-colors"
            onClick={() => navigate(`/reception/reservations/${item.reservationId}`)}
        >
            <div className="flex flex-col gap-1.5">
                {/* LINE 1: GUEST & ROOM */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        {/* Compact Avatar */}
                        <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-black text-[10px] flex-shrink-0">
                            {item.guestName.substring(0, 1).toUpperCase()}
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-black text-slate-900 text-[13px] truncate uppercase tracking-tight">
                                {item.guestName}
                            </span>
                            {/* Status Dot */}
                            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColor)} title={item.status} />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-black text-slate-700 flex-shrink-0">
                        <Bed className="w-3 h-3 text-blue-500" />
                        <span>{item.roomNumbers?.join(', ') || '—'}</span>
                    </div>
                </div>

                {/* LINE 2: ID, DATES & ACTION */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center gap-1 truncate uppercase tracking-tighter">
                            <Hash className="w-2.5 h-2.5 text-slate-300" />
                            <span>{item.bookingNumber}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <CalendarDays className="w-2.5 h-2.5 text-slate-300" />
                            <span>{formatShortDate(item.checkIn)} - {formatShortDate(item.checkOut)}</span>
                        </div>
                    </div>

                    <div className="flex-shrink-0">
                        {item.status === 'Confirmed' || item.status === 'Draft' ? (
                            <div className="flex items-center gap-1">
                                <Button
                                    size="sm"
                                    className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black text-[9px] uppercase tracking-widest"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-in', item);
                                    }}
                                >
                                    <LogIn className="w-3 h-3 mr-1" />
                                    {t('reception.checkin', 'IN')}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-400 hover:bg-rose-50"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('no-show', item);
                                    }}
                                    title={t('reception.no_show', 'No Show')}
                                >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ) : item.status === 'CheckedIn' ? (
                            <Button
                                size="sm"
                                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[9px] uppercase tracking-widest"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('check-out', item);
                                }}
                            >
                                <LogOut className="w-3 h-3 mr-1" />
                                {t('reception.checkout', 'OUT')}
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/reception/reservations/${item.reservationId}`);
                                }}
                                title={t('view_details', 'View')}
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
