import { useForm, useFieldArray } from 'react-hook-form';
import { addDays, format, parseISO } from 'date-fns';
import { PaymentMethodEnum, CurrencyCodeEnum } from '@/api/types/reservations';
import type { PaymentMethodValue, CurrencyCodeValue } from '@/api/types/reservations';

export interface ReservationLineFormValues {
    roomTypeId: number;
    roomId: number;
    ratePerNight: number;
}

export interface ReservationFormValues {
    guestName: string;
    email: string;
    phone: string;
    checkInDate: string;
    checkOutDate: string;
    paidAtArrival: boolean;
    hotelName: string;
    balanceDue: number;
    paymentMethod: PaymentMethodValue;
    currencyCode: CurrencyCodeValue;
    currencyOther: string;
    lines: ReservationLineFormValues[];
}

export const useReservationForm = (defaultHotelName: string = 'Walk-in') => {
    const today = new Date();
    const tomorrow = addDays(today, 1);

    const form = useForm<ReservationFormValues>({
        defaultValues: {
            guestName: '',
            email: '',
            phone: '',
            checkInDate: format(today, 'yyyy-MM-dd'),
            checkOutDate: format(tomorrow, 'yyyy-MM-dd'),
            paidAtArrival: true,
            hotelName: defaultHotelName,
            balanceDue: 0,
            paymentMethod: PaymentMethodEnum.Cash,
            currencyCode: CurrencyCodeEnum.USD,
            currencyOther: '',
            lines: [{ roomTypeId: 0, roomId: 0, ratePerNight: 0 }]
        }
    });

    const { control, watch, setValue } = form;
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'lines'
    });

    const checkInDate = watch('checkInDate');
    const checkOutDate = watch('checkOutDate');
    const lines = watch('lines');

    const calculateNights = () => {
        if (!checkInDate || !checkOutDate) return 0;
        try {
            const start = parseISO(checkInDate);
            const end = parseISO(checkOutDate);
            const diffTime = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
        } catch {
            return 0;
        }
    };

    const nights = calculateNights();

    const calculateTotal = () => {
        const nightlyTotal = lines.reduce((sum, line) => sum + (Number(line.ratePerNight) || 0), 0);
        return nights > 0 ? nightlyTotal * nights : nightlyTotal; // Default to 1 night price if same day or error
    };

    const totalAmount = calculateTotal();

    return {
        form,
        fields,
        append,
        remove,
        nights,
        totalAmount,
        watch,
        setValue
    };
};
