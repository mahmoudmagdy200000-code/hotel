import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Bed, AlertCircle, Utensils, ChevronRight, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { BookingDisplayData } from '@/api/adapters/bookingAdapter';
import { format, parseISO } from 'date-fns';
import { StatusBadge } from '@/components/reservation/StatusBadge';
import { isLateCheckout } from '@/utils/reservation.utils';
import { cn } from '@/lib/utils';

interface UnifiedBookingRowProps {
    booking: BookingDisplayData;
    onAction?: (type: string, booking: BookingDisplayData) => void;
    detailPath?: string;
    showAction?: boolean;
    isDesktop?: boolean;
    currentTime?: Date;
    onAssignRoom?: (reservationId: string) => void;
}

export const UnifiedBookingRow = ({
    booking,
    onAction,
    detailPath,
    showAction = true,
    isDesktop = false,
    currentTime,
    onAssignRoom
}: UnifiedBookingRowProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleNavigate = () => {
        if (detailPath) {
            navigate(detailPath);
        }
    };

    const formatDateStr = (dateStr: string) => {
        if (!dateStr) return '';
        if (!isDesktop) return dateStr;
        try {
            return format(parseISO(dateStr), 'dd MMM');
        } catch {
            return dateStr;
        }
    };

    const isLate = currentTime ? isLateCheckout({ departureDate: booking.checkOutDate, status: booking.status }, currentTime) : false;

    return (
        <TableRow
            className={cn(
                "transition-all group cursor-pointer border-b border-slate-100",
                isLate ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-slate-50/50"
            )}
            onClick={handleNavigate}
        >
            {/* GUEST DETAILS */}
            <TableCell className="py-4 px-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-slate-900/10 border border-slate-800">
                        {booking.guestInitials}
                    </div>
                    <div className="min-w-0">
                        <div className={cn(
                            "font-black uppercase tracking-tight text-sm flex items-center gap-2",
                            isLate ? "text-red-900" : "text-slate-900"
                        )}>
                            <span className="truncate max-w-[180px]">{booking.guestName}</span>
                            <StatusBadge status={booking.status} className="scale-75 origin-left flex-shrink-0" />
                            {booking.isPriceLocked && <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                        </div>
                        <div className={cn(
                            "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                            isLate ? "text-red-600" : "text-slate-500"
                        )}>
                            {booking.phone || t('no_phone', 'No Contact')}
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* REFERENCE */}
            <TableCell className="py-4 px-4">
                <span className="bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-black text-[10px] uppercase tracking-tighter border border-slate-200">
                    {booking.bookingNumber || '—'}
                </span>
            </TableCell>

            {/* STAY PERIOD */}
            <TableCell className="py-4 px-4">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-slate-900 tracking-tighter">{formatDateStr(booking.checkInDate)}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">to {formatDateStr(booking.checkOutDate)}</span>
                        {booking.isEarlyCheckOut && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black rounded border border-amber-200 uppercase tracking-tighter">
                                {t('reception.left_early', 'Left Early')}
                            </span>
                        )}
                        {isLate && (
                            <span className="flex items-center gap-1 animate-pulse px-1.5 py-0.5 bg-red-100 text-red-700 text-[8px] font-black rounded border border-red-300 uppercase tracking-tighter shadow-sm">
                                <AlertCircle className="w-2.5 h-2.5" />
                                {t('reception.late_checkout', 'Late')}
                            </span>
                        )}
                    </div>
                </div>
            </TableCell>

            {/* ACCOMMODATION */}
            <TableCell className="py-4 px-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg flex-shrink-0">
                        <Bed className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-xs font-black text-slate-900 tracking-tighter uppercase truncate max-w-[120px]">
                                {booking.roomTypeNames.length > 0 ? booking.roomTypeNames.join(', ') : t('unassigned_type', 'Unassigned Type')}
                            </div>
                            {booking.mealPlan && (
                                <span className="flex items-center gap-1 bg-sky-50 text-sky-700 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-sky-200 uppercase tracking-tighter">
                                    <Utensils className="w-2.5 h-2.5" />
                                    {booking.mealPlan}
                                </span>
                            )}
                            {booking.balanceDue > 0 && (
                                <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md border border-amber-200 uppercase tracking-tighter">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    {booking.balanceDue} {booking.currency}
                                </span>
                            )}
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[140px] tracking-tighter mt-0.5">
                            {booking.roomNumbers.length > 0 ? (
                                `${t('reception.room', 'Room')} ${booking.roomNumbers.join(', ')}`
                            ) : (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAssignRoom?.(booking.id.toString());
                                    }}
                                    className={cn(
                                        "hover:text-blue-600 transition-colors",
                                        onAssignRoom && "cursor-pointer underline decoration-dotted"
                                    )}
                                >
                                    {t('no_room_assigned', 'No Room Assigned')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* ACTIONS */}
            <TableCell className="py-4 px-8 text-right">
                <div className="flex justify-end items-center gap-3">
                    {!showAction && (
                        <div className="font-black text-slate-900 text-sm mr-4">
                            {booking.totalAmount === 0 ? t('reservations.no_price', 'Price not set') : formatCurrency(booking.totalAmount, booking.currency)}
                        </div>
                    )}

                    {showAction && onAction && (
                        <>
                            {(booking.status === 'Confirmed' || booking.status === 'Draft') && (
                                <Button
                                    size="sm"
                                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-5 rounded-xl shadow-lg shadow-emerald-900/10 active:scale-95 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-in', booking);
                                    }}
                                >
                                    {t('reception.check_in', 'Check In')}
                                </Button>
                            )}

                            {booking.status === 'CheckedIn' && (
                                <Button
                                    size="sm"
                                    className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-5 rounded-xl shadow-lg shadow-blue-900/10 active:scale-95 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-out', booking);
                                    }}
                                >
                                    {t('reception.check_out', 'Check Out')}
                                </Button>
                            )}
                        </>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-sm text-slate-500 hover:text-slate-900 transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNavigate();
                        }}
                    >
                        {showAction ? <Eye className="w-4 h-4" /> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
};
