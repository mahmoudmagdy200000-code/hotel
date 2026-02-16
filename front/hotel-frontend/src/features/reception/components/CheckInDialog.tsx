import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { format, parseISO } from 'date-fns';
import { PaymentMethodEnum } from '@/api/types/reservations';
import type { PaymentMethodValue } from '@/api/types/reservations';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import { Wallet, CreditCard, MoreHorizontal, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckInDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (
        guestName: string,
        phone: string,
        bookingNumber: string,
        checkInDate: string | undefined, // yyyy-MM-dd
        checkOutDate: string | undefined, // yyyy-MM-dd
        balanceDue: number,
        paymentMethod: PaymentMethodValue
    ) => void;
    reservation: ReceptionReservationItemDto | null;
    isPending: boolean;
}

const CheckInDialog: React.FC<CheckInDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    reservation,
    isPending
}) => {
    const { t } = useTranslation();
    const [guestName, setGuestName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [bookingNumber, setBookingNumber] = useState<string>('');
    const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
    const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
    const [balanceDue, setBalanceDue] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(PaymentMethodEnum.Cash);

    useEffect(() => {
        if (reservation) {
            setGuestName(reservation.guestName || '');
            setPhone(reservation.phone || '');
            setBookingNumber(reservation.bookingNumber || '');
            setCheckInDate(reservation.checkIn ? parseISO(reservation.checkIn) : undefined);
            setCheckOutDate(reservation.checkOut ? parseISO(reservation.checkOut) : undefined);
            setBalanceDue(reservation.balanceDue);

            // Map string from DTO to enum value
            const method = reservation.paymentMethod as keyof typeof PaymentMethodEnum;
            if (PaymentMethodEnum[method]) {
                setPaymentMethod(PaymentMethodEnum[method]);
            } else {
                setPaymentMethod(PaymentMethodEnum.Cash);
            }
        }
    }, [reservation, isOpen]);

    const handleConfirm = () => {
        onConfirm(
            guestName,
            phone,
            bookingNumber,
            checkInDate ? format(checkInDate, 'yyyy-MM-dd') : undefined,
            checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : undefined,
            balanceDue,
            paymentMethod
        );
    };

    if (!reservation) return null;

    const paymentMethods = [
        { value: PaymentMethodEnum.Cash, label: t('reservations.cash', 'Cash'), icon: Banknote },
        { value: PaymentMethodEnum.Visa, label: t('reservations.visa', 'Visa'), icon: CreditCard },
        { value: PaymentMethodEnum.Other, label: t('reservations.other', 'Other'), icon: MoreHorizontal },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-hidden border-none shadow-2xl p-0">
                <div className="bg-slate-900 p-6 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-emerald-400" />
                            {t('reception.check_in_title', 'Complete Check-In')}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {t('reception.check_in_description', 'Update final payment details for {{guest}}.', { guest: reservation.guestName })}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6 bg-white max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="guestName" className="text-sm font-semibold text-slate-700">
                                {t('reservations.guest_name', 'Guest Name')}
                            </Label>
                            <Input
                                id="guestName"
                                placeholder={t('reservations.guest_name_placeholder', 'Enter guest name')}
                                className="h-11 border-slate-200 focus:ring-2 focus:ring-slate-900/5 rounded-xl transition-all"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="bookingNumber" className="text-sm font-semibold text-slate-700">
                                {t('reception.booking_number', 'Booking #')}
                            </Label>
                            <Input
                                id="bookingNumber"
                                placeholder={t('reception.booking_number_placeholder', 'Enter booking number')}
                                className="h-11 border-slate-200 focus:ring-2 focus:ring-slate-900/5 rounded-xl transition-all"
                                value={bookingNumber}
                                onChange={(e) => setBookingNumber(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                {t('reservations.check_in', 'Check In')}
                            </Label>
                            <DatePicker
                                date={checkInDate}
                                setDate={setCheckInDate}
                                className="h-11 rounded-xl"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                {t('reservations.check_out', 'Check Out')}
                            </Label>
                            <DatePicker
                                date={checkOutDate}
                                setDate={setCheckOutDate}
                                className="h-11 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                            {t('reservations.phone', 'Phone')}
                        </Label>
                        <Input
                            id="phone"
                            placeholder={t('reservations.phone_placeholder', 'Enter phone number')}
                            className="h-11 border-slate-200 focus:ring-2 focus:ring-slate-900/5 rounded-xl transition-all"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="balanceDue" className="text-sm font-semibold text-slate-700">
                            {t('reservations.balance_due', 'Balance Due')}
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                                $
                            </span>
                            <Input
                                id="balanceDue"
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-7 h-11 border-slate-200 focus:ring-2 focus:ring-slate-900/5 rounded-xl transition-all"
                                value={balanceDue}
                                onChange={(e) => setBalanceDue(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400">
                            {t('reservations.balance_due_hint', 'Remaining unpaid amount')}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700">
                            {t('reservations.payment_method', 'Payment Method')}
                        </Label>
                        <div className="grid grid-cols-1 gap-2">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const isActive = paymentMethod === method.value;
                                return (
                                    <button
                                        key={method.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(method.value)}
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-sm font-medium text-left",
                                            isActive
                                                ? "border-slate-900 bg-slate-50 text-slate-900 shadow-sm"
                                                : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg transition-colors",
                                                isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                                            )}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            {method.label}
                                        </div>
                                        {isActive && (
                                            <div className="h-2 w-2 rounded-full bg-slate-900" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-0 bg-white">
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isPending}
                            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-95 transition-all"
                        >
                            {isPending ? t('common.loading', 'Loading...') : t('reception.checkin', 'Check In')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CheckInDialog;
