import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Hash, CalendarDays, Bed, LogIn, LogOut, Eye, AlertCircle, Utensils, Lock, Home } from 'lucide-react';
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
            className="bg-white border-b border-slate-200 p-4 active:bg-slate-50 transition-colors cursor-pointer w-full"
            onClick={handleNavigate}
        >
            <div className="flex flex-col gap-2.5">

                {/* ROW 1: Avatar + Guest Name + Status (name gets full width, no competition) */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-sm border border-slate-800">
                        {booking.guestInitials}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-black text-slate-900 text-[15px] truncate uppercase tracking-tight">
                                {booking.guestName}
                            </span>
                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusColor)} title={booking.status} />
                            <StatusBadge status={booking.status} className="scale-[0.85] origin-left flex-shrink-0" />
                        </div>
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest truncate mt-0.5">
                            {booking.phone || t('reception.no_phone', 'No Phone')}
                        </div>
                    </div>
                </div>

                {/* ROW 2: Badges — Room Type, Meal Plan, Locked — wrap freely on their own row */}
                <div className="flex flex-wrap items-center gap-1.5 pl-12">
                    {booking.roomNumbers.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                            <Home className="w-3 h-3 text-emerald-600" />
                            <span className="uppercase">{t('reception.room', 'Room')} {booking.roomNumbers.join(', ')}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                        <Bed className="w-3 h-3 text-blue-600" />
                        <span className="uppercase">{booking.roomTypeNames.length > 0 ? booking.roomTypeNames.join(', ') : t('unassigned', 'Unassigned')}</span>
                    </div>
                    {booking.mealPlan && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200">
                            <Utensils className="w-3 h-3 text-sky-600" />
                            <span className="uppercase">{booking.mealPlan}</span>
                        </div>
                    )}
                    {booking.isPriceLocked && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-1 rounded border border-amber-200 uppercase tracking-tighter">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>LOCKED</span>
                        </div>
                    )}
                    {booking.isEarlyCheckOut && (
                        <div className="px-1.5 py-1 bg-orange-50 text-orange-700 text-[9px] font-black rounded border border-orange-200 uppercase tracking-tighter">
                            {t('reception.left_early', 'Left Early')}
                        </div>
                    )}
                </div>

                {/* ROW 3: Booking #, Dates, Balance + Action/Price */}
                <div className="flex flex-wrap items-center gap-2 pl-12">
                    {/* Metadata chips */}
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                        <Hash className="w-3 h-3 text-slate-500" />
                        <span>{booking.bookingNumber || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-black text-slate-600">
                        <CalendarDays className="w-3 h-3 text-slate-500" />
                        <span>{formatShortDate(booking.checkInDate)} – {formatShortDate(booking.checkOutDate)}</span>
                    </div>
                    {booking.balanceDue > 0 && (
                        <div className="flex items-center gap-1 text-amber-700 font-black bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 text-[10px]">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>{booking.balanceDue} {booking.currency}</span>
                        </div>
                    )}

                    {/* Spacer to push action/price to the right */}
                    <div className="flex-1" />

                    {/* Action button (Reception view) */}
                    {showAction && onAction && (
                        <div className="flex-shrink-0 flex items-center gap-2">
                            {(booking.status === 'Confirmed' || booking.status === 'Draft') && (
                                <Button
                                    size="sm"
                                    className="min-h-[44px] px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-emerald-900/10 active:scale-95 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-in', booking);
                                    }}
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    {t('reception.check_in', 'Check In')}
                                </Button>
                            )}
                            {booking.status === 'CheckedIn' && (
                                <Button
                                    size="sm"
                                    className="min-h-[44px] px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md shadow-blue-900/10 active:scale-95 transition-all"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction('check-out', booking);
                                    }}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t('reception.check_out', 'Check Out')}
                                </Button>
                            )}
                            {booking.status !== 'Confirmed' && booking.status !== 'Draft' && booking.status !== 'CheckedIn' && (
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

                    {/* Total Price (Reservations list view) */}
                    {(!showAction || !onAction) && (
                        <div className="flex-shrink-0">
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