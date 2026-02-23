import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Loader2, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { getRooms } from '@/api/rooms';
import type { ReservationDto, UpdateReservationCommand } from '@/api/types/reservations';
import { PaymentMethodEnum, CurrencyCodeEnum } from '@/api/types/reservations';
import type { CurrencyCodeValue } from '@/api/types/reservations';
import type { DateRange } from 'react-day-picker';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    reservation: ReservationDto;
    onSubmit: (id: number, command: UpdateReservationCommand) => Promise<unknown>;
    isSubmitting: boolean;
}

export function EditReservationDialog({ isOpen, onClose, reservation, onSubmit, isSubmitting }: Props) {
    const { t } = useTranslation();

    // Fetch rooms
    const { data: rooms, isLoading: isLoadingRooms } = useQuery({
        queryKey: ['rooms'],
        queryFn: getRooms
    });

    const { register, control, handleSubmit, watch, setValue, reset } = useForm<UpdateReservationCommand>({
        defaultValues: {
            id: reservation.id,
            guestName: reservation.guestName,
            phone: reservation.phone,
            checkInDate: reservation.checkInDate,
            checkOutDate: reservation.checkOutDate,
            status: reservation.status,
            paidAtArrival: reservation.paidAtArrival,
            currency: reservation.currency,
            lines: [],
            // Phase 7.1
            hotelName: reservation.hotelName ?? '',
            balanceDue: reservation.balanceDue ?? 0,
            paymentMethod: reservation.paymentMethod ?? PaymentMethodEnum.Cash,
            currencyCode: reservation.currencyCode ?? CurrencyCodeEnum.EGP,
            currencyOther: reservation.currencyOther ?? ''
        }
    });

    useEffect(() => {
        if (isOpen && reservation) {
            reset({
                id: reservation.id,
                guestName: reservation.guestName,
                phone: reservation.phone,
                checkInDate: reservation.checkInDate,
                checkOutDate: reservation.checkOutDate,
                status: reservation.status,
                paidAtArrival: reservation.paidAtArrival,
                currency: reservation.currency,
                lines: reservation.lines.map(l => ({
                    roomId: l.roomId,
                    ratePerNight: l.ratePerNight
                })),
                // Phase 7.1
                hotelName: reservation.hotelName ?? '',
                balanceDue: reservation.balanceDue ?? 0,
                paymentMethod: reservation.paymentMethod ?? PaymentMethodEnum.Cash,
                currencyCode: reservation.currencyCode ?? CurrencyCodeEnum.EGP,
                currencyOther: reservation.currencyOther ?? ''
            });
        }
    }, [isOpen, reservation, reset]);

    const handleSave = async (data: UpdateReservationCommand) => {
        // Clean up currencyOther if not needed
        const cleaned: UpdateReservationCommand = {
            ...data,
            hotelName: data.hotelName || null,
            currencyOther: data.currencyCode === CurrencyCodeEnum.Other ? data.currencyOther : null,
            balanceDue: Number(data.balanceDue) || 0
        };
        await onSubmit(reservation.id, cleaned);
        onClose();
    };

    const checkIn = watch('checkInDate');
    const checkOut = watch('checkOutDate');
    const watchedCurrencyCode = watch('currencyCode');
    const dateRange: DateRange | undefined = checkIn && checkOut ? {
        from: parseISO(checkIn),
        to: parseISO(checkOut)
    } : undefined;

    const isComplex = reservation.lines.length > 1;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t('reservations.edit_reservation', 'Edit Reservation')}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('reservations.guest_name', 'Guest Name')}</Label>
                        <Input {...register('guestName', { required: true })} />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('reservations.phone', 'Phone')}</Label>
                        <Input {...register('phone')} />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('reservations.hotel_name', 'Hotel Name')}</Label>
                        <Input {...register('hotelName')} maxLength={120} placeholder={t('reservations.hotel_name_placeholder', 'e.g. Grand Hyatt Cairo')} />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('dates', 'Dates')}</Label>
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={(range) => {
                                if (range?.from) setValue('checkInDate', format(range.from, 'yyyy-MM-dd'));
                                if (range?.to) setValue('checkOutDate', format(range.to, 'yyyy-MM-dd'));
                            }}
                            className="w-full"
                        />
                    </div>

                    {/* Financial Fields */}
                    <div className="border-t border-slate-100 pt-4 space-y-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {t('reservations.financial_info', 'Financial Details')}
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('reservations.currency', 'Currency')}</Label>
                                <Controller
                                    name="currencyCode"
                                    control={control}
                                    render={({ field }) => (
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                            value={field.value}
                                            onChange={(e) => {
                                                const val = Number(e.target.value) as CurrencyCodeValue;
                                                field.onChange(val);
                                                const currencyMap: Record<number, string> = { 1: 'EGP', 2: 'USD', 3: 'EUR' };
                                                setValue('currency', currencyMap[val] || 'OTH');
                                            }}
                                        >
                                            <option value={CurrencyCodeEnum.EGP}>EGP</option>
                                            <option value={CurrencyCodeEnum.USD}>USD</option>
                                            <option value={CurrencyCodeEnum.EUR}>EUR</option>
                                            <option value={CurrencyCodeEnum.Other}>{t('other', 'Other')}</option>
                                        </select>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('reservations.payment_method', 'Payment Method')}</Label>
                                <Controller
                                    name="paymentMethod"
                                    control={control}
                                    render={({ field }) => (
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                                            value={field.value}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                        >
                                            <option value={PaymentMethodEnum.Cash}>{t('reservations.cash', 'Cash')}</option>
                                            <option value={PaymentMethodEnum.Visa}>{t('reservations.visa', 'Visa')}</option>
                                            <option value={PaymentMethodEnum.Other}>{t('other', 'Other')}</option>
                                        </select>
                                    )}
                                />
                            </div>
                        </div>

                        {watchedCurrencyCode === CurrencyCodeEnum.Other && (
                            <div className="space-y-2">
                                <Label>{t('reservations.currency_other', 'Currency Name')}</Label>
                                <Input {...register('currencyOther')} maxLength={12} placeholder="e.g. GBP, SAR" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{t('reservations.balance_due', 'Balance Due')}</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                {...register('balanceDue', { valueAsNumber: true })}
                                placeholder="0.00"
                            />
                            <p className="text-xs text-slate-400 flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                {t('reservations.balance_due_hint', 'Remaining unpaid amount')}
                            </p>
                        </div>
                    </div>

                    {isComplex ? (
                        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                            Multi-room editing is disabled in this quick editor. Only Date/Guest changes will be saved.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>{t('rooms.room', 'Room')}</Label>
                            {isLoadingRooms ? <Loader2 className="animate-spin h-4 w-4" /> : (
                                <Controller
                                    name="lines"
                                    control={control}
                                    render={({ field }) => {
                                        const currentRoomId = field.value?.[0]?.roomId;
                                        return (
                                            <select
                                                className="w-full border rounded-md p-2 bg-transparent text-sm"
                                                value={currentRoomId || ''}
                                                onChange={(e) => {
                                                    const newRoomId = Number(e.target.value);
                                                    setValue('lines', [{ roomId: newRoomId, ratePerNight: null }]);
                                                }}
                                            >
                                                <option value="" disabled>Select Room</option>
                                                {rooms?.map(room => (
                                                    <option key={room.id} value={room.id}>
                                                        {room.roomNumber} - {room.roomTypeName}
                                                    </option>
                                                ))}
                                            </select>
                                        );
                                    }}
                                />
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
                            {t('cancel', 'Cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save', 'Save Changes')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
