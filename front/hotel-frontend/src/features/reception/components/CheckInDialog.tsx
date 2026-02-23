import React, { useState, useEffect, useMemo } from 'react';
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
import { PaymentMethodEnum, CurrencyCodeEnum } from '@/api/types/reservations';
import type { PaymentMethodValue } from '@/api/types/reservations';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import { Wallet, CreditCard, MoreHorizontal, Banknote, AlertTriangle, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRooms } from '@/hooks/rooms/useRooms';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CheckInDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (
        guestName: string,
        phone: string,
        bookingNumber: string,
        checkInDate: string | undefined, // yyyy-MM-dd
        checkOutDate: string | undefined, // yyyy-MM-dd
        totalAmount: number,
        balanceDue: number,
        paymentMethod: PaymentMethodValue,
        currencyCode: number,
        roomAssignments?: Array<{ lineId: number; roomId: number }>
    ) => void;
    reservation: ReceptionReservationItemDto | null;
    isPending: boolean;
    businessDate: string; // yyyy-MM-dd — today's business date
}

const CheckInDialog: React.FC<CheckInDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    reservation,
    isPending,
    businessDate
}) => {
    const { t } = useTranslation();
    const [guestName, setGuestName] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [bookingNumber, setBookingNumber] = useState<string>('');
    const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
    const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [balanceDue, setBalanceDue] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(PaymentMethodEnum.Cash);
    const [currencyCode, setCurrencyCode] = useState<number>(CurrencyCodeEnum.USD);
    const [dateWasAutoAdjusted, setDateWasAutoAdjusted] = useState(false);
    const [roomAssignments, setRoomAssignments] = useState<Record<number, number>>({});

    const { data: rooms } = useRooms();

    useEffect(() => {
        if (reservation) {
            setGuestName(reservation.guestName || '');
            setPhone(reservation.phone || '');
            setBookingNumber(reservation.bookingNumber || '');
            setTotalAmount(reservation.totalAmount || 0);
            setBalanceDue(reservation.balanceDue);

            // Initialize room assignments from reservation lines
            const initialAssignments: Record<number, number> = {};
            reservation.lines.forEach(line => {
                initialAssignments[line.id] = line.roomId;
            });
            setRoomAssignments(initialAssignments);

            // Map string from DTO to enum value
            const method = reservation.paymentMethod as keyof typeof PaymentMethodEnum;
            if (PaymentMethodEnum[method]) {
                setPaymentMethod(PaymentMethodEnum[method]);
            } else {
                setPaymentMethod(PaymentMethodEnum.Cash);
            }
            setCurrencyCode(reservation.currencyCode || CurrencyCodeEnum.USD);

            // ── Date auto-adjustment ──────────────────────────────
            // If check-in date doesn't match today, auto-set it to today
            // and shift checkout to preserve the same number of nights.
            const origCheckIn = reservation.checkIn ? parseISO(reservation.checkIn) : undefined;
            const origCheckOut = reservation.checkOut ? parseISO(reservation.checkOut) : undefined;
            const today = parseISO(businessDate);

            if (origCheckIn && origCheckOut) {
                const checkInDateOnly = format(origCheckIn, 'yyyy-MM-dd');
                if (checkInDateOnly !== businessDate) {
                    // Preserve number of nights
                    const nights = Math.max(1, Math.round((origCheckOut.getTime() - origCheckIn.getTime()) / (1000 * 60 * 60 * 24)));
                    const adjustedCheckOut = new Date(today);
                    adjustedCheckOut.setDate(adjustedCheckOut.getDate() + nights);
                    setCheckInDate(today);
                    setCheckOutDate(adjustedCheckOut);
                    setDateWasAutoAdjusted(true);
                } else {
                    setCheckInDate(origCheckIn);
                    setCheckOutDate(origCheckOut);
                    setDateWasAutoAdjusted(false);
                }
            } else {
                setCheckInDate(origCheckIn || today);
                setCheckOutDate(origCheckOut);
                setDateWasAutoAdjusted(!origCheckIn || format(origCheckIn!, 'yyyy-MM-dd') !== businessDate);
            }
        }
    }, [reservation, isOpen, businessDate]);

    // Client-side validation: checkout must be after check-in
    const isDateInvalid = useMemo(() => {
        if (!checkInDate || !checkOutDate) return false;
        return checkOutDate.getTime() <= checkInDate.getTime();
    }, [checkInDate, checkOutDate]);

    const handleConfirm = () => {
        if (isDateInvalid) return;
        onConfirm(
            guestName,
            phone,
            bookingNumber,
            checkInDate ? format(checkInDate, 'yyyy-MM-dd') : undefined,
            checkOutDate ? format(checkOutDate, 'yyyy-MM-dd') : undefined,
            totalAmount,
            balanceDue,
            paymentMethod,
            currencyCode,
            Object.entries(roomAssignments).map(([lineId, roomId]) => ({
                lineId: parseInt(lineId),
                roomId
            }))
        );
    };

    if (!reservation) return null;

    const paymentMethods = [
        { value: PaymentMethodEnum.Cash, label: t('reservations.cash', 'Cash'), icon: Banknote },
        { value: PaymentMethodEnum.Visa, label: t('reservations.visa', 'Visa'), icon: CreditCard },
        { value: PaymentMethodEnum.Other, label: t('reservations.other', 'Other'), icon: MoreHorizontal },
    ];

    const getCurrencySymbol = (code: number) => {
        switch (code) {
            case CurrencyCodeEnum.USD: return '$';
            case CurrencyCodeEnum.EUR: return '€';
            case CurrencyCodeEnum.EGP: return 'EGP';
            default: return '$';
        }
    };

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

                    {dateWasAutoAdjusted && (
                        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-amber-800">
                                <span className="font-bold">{t('reception.dates_auto_adjusted', 'Dates auto-adjusted')}: </span>
                                {t('reception.dates_auto_adjusted_desc', 'Check-in shifted to today. The number of nights has been preserved. Review below before confirming.')}
                            </div>
                        </div>
                    )}

                    {isDateInvalid && (
                        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-red-800 font-bold">
                                {t('reception.checkout_before_checkin', 'Check-out date must be after check-in date.')}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-slate-700">
                                {t('reservations.check_in', 'Check In')}
                            </Label>
                            <DatePicker
                                date={checkInDate}
                                setDate={(newCheckIn) => {
                                    if (newCheckIn && checkInDate && checkOutDate) {
                                        // Preserve the same number of nights
                                        const originalNights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
                                        const newCheckOut = new Date(newCheckIn);
                                        newCheckOut.setDate(newCheckOut.getDate() + originalNights);
                                        setCheckOutDate(newCheckOut);
                                    } else if (newCheckIn && checkOutDate && newCheckIn >= checkOutDate) {
                                        // If no original check-in but new check-in is after checkout, push checkout to +1 night
                                        const newCheckOut = new Date(newCheckIn);
                                        newCheckOut.setDate(newCheckOut.getDate() + 1);
                                        setCheckOutDate(newCheckOut);
                                    }
                                    setCheckInDate(newCheckIn);
                                }}
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

                    {/* Room Assignment Section */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            {t('reception.room_assignment', 'Room Assignment')}
                        </Label>
                        <div className="space-y-2">
                            {reservation.lines.map((line) => {
                                // Filter rooms of the same type
                                const availableForType = rooms?.filter(r => r.roomTypeId === line.roomTypeId && r.isActive) || [];
                                const currentRoomId = roomAssignments[line.id];

                                return (
                                    <div key={line.id} className="flex flex-col gap-2 p-3 border border-slate-100 rounded-xl bg-slate-50/50">
                                        <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                                            <span>{line.roomNumber} ({rooms?.find(r => r.id === line.roomId)?.roomTypeName || t('reception.any_room', 'Any room')})</span>
                                        </div>
                                        <Select
                                            value={currentRoomId?.toString()}
                                            onValueChange={(val) => setRoomAssignments(prev => ({ ...prev, [line.id]: parseInt(val) }))}
                                        >
                                            <SelectTrigger className="h-10 bg-white border-slate-200 rounded-lg">
                                                <SelectValue placeholder={t('reception.select_room', 'Select Room')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableForType.map(r => (
                                                    <SelectItem key={r.id} value={r.id.toString()}>
                                                        {r.roomNumber}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="totalAmount" className="text-sm font-semibold text-slate-700">
                                {t('reservations.total_amount', 'Total Amount')}
                            </Label>
                            <div className="relative">
                                <span className={cn(
                                    "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black uppercase",
                                    currencyCode === CurrencyCodeEnum.EGP ? "left-2.5" : "left-3"
                                )}>
                                    {getCurrencySymbol(currencyCode)}
                                </span>
                                <Input
                                    id="totalAmount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={cn(
                                        "h-11 border-slate-200 focus:ring-2 focus:ring-slate-900/5 rounded-xl transition-all",
                                        currencyCode === CurrencyCodeEnum.EGP ? "pl-10" : "pl-7"
                                    )}
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="balanceDue" className="text-sm font-semibold text-slate-700">
                                {t('reservations.balance_due', 'Balance Due')}
                            </Label>
                            <div className="relative">
                                <span className={cn(
                                    "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-black uppercase",
                                    currencyCode === CurrencyCodeEnum.EGP ? "left-2.5" : "left-3"
                                )}>
                                    {getCurrencySymbol(currencyCode)}
                                </span>
                                <Input
                                    id="balanceDue"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className={cn(
                                        "h-11 border-slate-200 focus:ring-2 focus:ring-slate-900/5 rounded-xl transition-all",
                                        currencyCode === CurrencyCodeEnum.EGP ? "pl-10" : "pl-7"
                                    )}
                                    value={balanceDue}
                                    onChange={(e) => setBalanceDue(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-1">
                        {[CurrencyCodeEnum.EGP, CurrencyCodeEnum.USD, CurrencyCodeEnum.EUR].map((code) => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => setCurrencyCode(code)}
                                className={cn(
                                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border transition-all",
                                    currencyCode === code
                                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                        : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                                )}
                            >
                                {code === CurrencyCodeEnum.EGP ? 'EGP' : code === CurrencyCodeEnum.USD ? 'USD' : 'EUR'}
                            </button>
                        ))}
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
                            {t('cancel', 'Cancel')}
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isPending || isDateInvalid}
                            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? t('loading', 'Loading...') : t('reception.checkin', 'Check In')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CheckInDialog;
