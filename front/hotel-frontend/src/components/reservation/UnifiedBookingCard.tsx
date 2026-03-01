import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Hash, CalendarDays, Bed, LogIn, LogOut, Eye, AlertCircle, Utensils, Lock } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import type { BookingDisplayData } from '@/api/adapters/bookingAdapter';
import { StatusBadge } from '@/components/reservation/StatusBadge';

interface UnifiedBookingCardProps {
    booking: BookingDisplayData;
    onAction?: (type: string, booking: BookingDisplayData) => void;
    detailPath?: string;
    showAction?: boolean;
}

export const UnifiedBookingCard = ({
    booking,
    onAction,
    detailPath,
    showAction = true
}: UnifiedBookingCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const formatShortDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[parseInt(parts[1]) - 1];
        return `${month} ${parts[2]}`;
    };

    const statusColor = booking.status === 'CheckedIn' ? 'bg-blue-500' :
        booking.status === 'Confirmed' ? 'bg-emerald-500' :
            booking.status === 'CheckedOut' ? 'bg-slate-400' : 'bg-amber-500';

    const handleNavigate = () => {
        if (detailPath) {
            navigate(detailPath);
        }
    };

    return (
        <div
            className="bg-white border-b border-slate-100 p-4 active:bg-slate-50 transition-colors cursor-pointer"
            onClick={handleNavigate}
        >
            <div className="flex flex-col gap-2">
                {/* LINE 1: GUEST & ROOM TYPE/MEAL PLAN */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {/* Compact Avatar */}
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm border border-slate-800">
                            {booking.guestInitials}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-black text-slate-900 text-[14px] truncate uppercase tracking-tight">
                                    {booking.guestName}
                                </span>
                                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", statusColor)} title={booking.status} />
                                <StatusBadge status={booking.status} className="ml-1 scale-[0.85] origin-left" />
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                {booking.phone || t('no_phone', 'No Phone')}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-center gap-1 text-[11px] font-black text-slate-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            <Bed className="w-3 h-3 text-blue-500" />
                            <span className="uppercase">{booking.roomTypeNames.length > 0 ? booking.roomTypeNames.join(', ') : t('unassigned', 'Unassigned')}</span>
                        </div>
                        {booking.mealPlan && (
                            <div className="flex items-center gap-1 text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded shadow-sm border border-sky-100">
                                <Utensils className="w-2.5 h-2.5" />
                                <span className="uppercase">{booking.mealPlan}</span>
                            </div>
                        )}
                        {booking.isPriceLocked && (
                            <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-tighter">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Locked</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* LINE 2: ID, DATES & ACTION */}
                <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-3 min-w-0 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center gap-1 truncate uppercase tracking-tighter bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            <Hash className="w-2.5 h-2.5 text-slate-300" />
                            <span>{booking.bookingNumber || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            <CalendarDays className="w-2.5 h-2.5 text-slate-300" />
                            <span>{formatShortDate(booking.checkInDate)} - {formatShortDate(booking.checkOutDate)}</span>
                        </div>
                        {booking.balanceDue > 0 && (
                            <div className="flex items-center gap-0.5 text-amber-600 font-black bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                <AlertCircle className="w-2.5 h-2.5" />
                                <span>{booking.balanceDue} {booking.currency}</span>
                            </div>
                        )}
                    </div>

                    {showAction && onAction && (
                        <div className="flex-shrink-0">
                            {booking.status === 'Confirmed' || booking.status === 'Draft' ? (
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-emerald-900/10 active:scale-95 transition-all"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAction('check-in', booking);
                                        }}
                                    >
                                        <LogIn className="w-3.5 h-3.5 mr-1.5" />
                                        {t('reception.check_in', 'Check In')}
                                    </Button>
                                </div>
                            ) : booking.status === 'CheckedIn' ? (
                                <Button
                                    size="sm"
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-blue-900/10 active:scale-95 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-out', booking);
                                    }}
                                >
                                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                                    {t('reception.check_out', 'Check Out')}
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-300 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNavigate();
                                    }}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    )}

                    {(!showAction || !onAction) && (
                        <div className="flex-shrink-0">
                            <div className="font-black text-slate-900 text-sm">
                                {booking.totalAmount === 0 ? t('reservations.no_price', 'No Price') : formatCurrency(booking.totalAmount, booking.currency)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
