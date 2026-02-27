export const ReservationStatus = {
    Draft: 1,
    Confirmed: 2,
    CheckedIn: 3,
    CheckedOut: 4,
    Cancelled: 5,
    NoShow: 6
} as const;

export type ReservationStatus = typeof ReservationStatus[keyof typeof ReservationStatus];

export const ReservationSource = {
    Manual: 1,
    PDF: 2,
    WhatsApp: 3,
    Booking: 4
} as const;

export type ReservationSource = typeof ReservationSource[keyof typeof ReservationSource];

// Phase 7.1 — Financial enums
export const PaymentMethodEnum = {
    Cash: 1,
    Visa: 2,
    Other: 3
} as const;

export type PaymentMethodValue = typeof PaymentMethodEnum[keyof typeof PaymentMethodEnum];

export const CurrencyCodeEnum = {
    EGP: 1,
    USD: 2,
    EUR: 3,
    Other: 4
} as const;

export type CurrencyCodeValue = typeof CurrencyCodeEnum[keyof typeof CurrencyCodeEnum];

export const PaymentMethodLabels: Record<PaymentMethodValue, string> = {
    [PaymentMethodEnum.Cash]: 'Cash',
    [PaymentMethodEnum.Visa]: 'Visa',
    [PaymentMethodEnum.Other]: 'Other'
};

export const CurrencyCodeLabels: Record<CurrencyCodeValue, string> = {
    [CurrencyCodeEnum.EGP]: 'EGP',
    [CurrencyCodeEnum.USD]: 'USD',
    [CurrencyCodeEnum.EUR]: 'EUR',
    [CurrencyCodeEnum.Other]: 'Other'
};

export interface ReservationLineDto {
    id: number;
    roomId: number;
    roomNumber: string;
    roomTypeId: number;
    roomTypeName: string;
    ratePerNight: number;
    nights: number;
    lineTotal: number;
}

export interface ReservationDto {
    id: number;
    bookingNumber?: string | null;
    guestName: string;
    phone?: string | null;
    checkInDate: string; // ISO date string yyyy-MM-dd
    checkOutDate: string; // ISO date string yyyy-MM-dd
    status: ReservationStatus;
    totalAmount: number;
    currency: string;
    paidAtArrival: boolean;
    source: ReservationSource;
    lines: ReservationLineDto[];
    // Phase 7.1 — Financial & Hotel fields
    hotelName?: string | null;
    balanceDue: number;
    paymentMethod: PaymentMethodValue;
    currencyCode: CurrencyCodeValue;
    currencyOther?: string | null;
    actualCheckOutDate?: string | null;
}

export interface GetReservationsQuery {
    from?: string; // ISO date-time string
    to?: string; // ISO date-time string
    status?: ReservationStatus;
    searchTerm?: string;
    includeLines?: boolean;
}

export interface CreateReservationLineCommand {
    roomId: number;
    ratePerNight?: number | null;
}

export interface CreateReservationCommand {
    guestName: string;
    phone?: string | null;
    checkInDate: string; // ISO date-time string
    checkOutDate: string; // ISO date-time string
    paidAtArrival?: boolean;
    currency?: string;
    status?: ReservationStatus;
    lines: CreateReservationLineCommand[];
    // Phase 7.1 — Financial & Hotel fields
    hotelName?: string | null;
    balanceDue?: number;
    paymentMethod?: PaymentMethodValue;
    currencyCode?: CurrencyCodeValue;
    currencyOther?: string | null;
}

export interface UpdateReservationCommand {
    id: number;
    guestName: string;
    phone?: string | null;
    checkInDate: string;
    checkOutDate: string;
    paidAtArrival: boolean;
    currency: string;
    status: ReservationStatus;
    lines: CreateReservationLineCommand[];
    // Phase 7.1 — Financial & Hotel fields
    hotelName?: string | null;
    balanceDue: number;
    paymentMethod: PaymentMethodValue;
    currencyCode: CurrencyCodeValue;
    currencyOther?: string | null;
}
