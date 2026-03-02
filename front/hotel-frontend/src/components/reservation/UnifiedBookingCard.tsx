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
            booking.status === 'CheckedOut' ? 'bg-slate-500' : 'bg-amber-500';

    const handleNavigate = () => {
        if (detailPath) {
            navigate(detailPath);
        }
    };

    return (
        <div
            className="bg-white border-b border-slate-200 p-4 active:bg-slate-50 transition-colors cursor-pointer w-full group"
            onClick={handleNavigate}
        >
            <div className="flex flex-col gap-3">
                {/* LINE 1: GUEST & ROOM TYPE/MEAL PLAN */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Compact Avatar */}
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm border border-slate-800">
                            {booking.guestInitials}
                        </div>

                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="font-black text-slate-900 text-[15px] truncate uppercase tracking-tight">
                                    {booking.guestName}
                                </span>
                                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusColor)} title={booking.status} />
                                <StatusBadge status={booking.status} className="ml-1 scale-[0.85] origin-left flex-shrink-0" />
                            </div>
                            <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest truncate mt-0.5">
                                {booking.phone || t('reception.no_phone', 'No Phone')}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                            <Bed className="w-3.5 h-3.5 text-blue-600" />
                            <span className="uppercase">{booking.roomTypeNames.length > 0 ? booking.roomTypeNames.join(', ') : t('unassigned')}</span>
                        </div>
                        {booking.mealPlan && (
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-sky-700 bg-sky-50 px-2.5 py-1 rounded shadow-sm border border-sky-200">
                                <Utensils className="w-3 h-3 text-sky-600" />
                                <span className="uppercase">{booking.mealPlan}</span>
                            </div>
                        )}
                        {booking.isPriceLocked && (
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-tighter">
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>LOCKED</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* LINE 2: ID, DATES & ACTIONS */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 pt-1">

                    {/* METADATA WRAPPER - Increased contrast and font weight */}
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate uppercase tracking-tighter bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-600">
                            <Hash className="w-3.5 h-3.5 text-slate-500" />
                            <span>{booking.bookingNumber || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-600">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
                            <span>{formatShortDate(booking.checkInDate)} - {formatShortDate(booking.checkOutDate)}</span>
                        </div>
                        {booking.balanceDue > 0 && (
                            <div className="flex items-center gap-1.5 text-amber-700 font-black bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 text-[10px]">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span>{booking.balanceDue} {booking.currency}</span>
                            </div>
                        )}
                    </div>

                    {/* ACTIONS WRAPPER - Complies with 44x44px touch target */}
                    {showAction && onAction && (
                        <div className="flex-shrink-0 ml-auto sm:ml-0 mt-1 sm:mt-0 flex items-center gap-2">
                            {booking.status === 'Confirmed' || booking.status === 'Draft' ? (
                                <Button
                                    size="sm"
                                    className="min-h-[44px] px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-emerald-900/10 active:scale-95 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-in', booking);
                                    }}
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    {t('reception.check_in', 'Check In')}
                                </Button>
                            ) : booking.status === 'CheckedIn' ? (
                                <Button
                                    size="sm"
                                    className="min-h-[44px] px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-blue-900/10 active:scale-95 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-out', booking);
                                    }}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t('reception.check_out', 'Check Out')}
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNavigate();
                                    }}
                                >
                                    <Eye className="w-5 h-5" />
                                </Button>
                            )}
                        </div>
                    )}

                    {(!showAction || !onAction) && (
                        <div className="flex-shrink-0 ml-auto mt-1 sm:mt-0">
                            <div className="font-black text-slate-900 text-base tracking-tighter">
                                {booking.totalAmount === 0 ? t('reservations.no_price', 'No Price') : formatCurrency(booking.totalAmount, booking.currency)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};