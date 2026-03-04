import type { CurrencyCodeValue } from './reservations';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PaymentStatusEnum = {
    Pending: 0,
    Paid: 1,
} as const;

export type PaymentStatusValue = typeof PaymentStatusEnum[keyof typeof PaymentStatusEnum];

export const PaymentStatusLabels: Record<PaymentStatusValue, string> = {
    [PaymentStatusEnum.Pending]: 'Pending',
    [PaymentStatusEnum.Paid]: 'Paid',
};

/** Mirrors the backend PaymentMethod enum (Cash=1, Visa=2, Other=3). */
export const PaymentMethodEnum = {
    Cash: 1,
    Visa: 2,
    Other: 3,
} as const;

export type PaymentMethodValue = typeof PaymentMethodEnum[keyof typeof PaymentMethodEnum];

export const PaymentMethodLabels: Record<PaymentMethodValue, string> = {
    [PaymentMethodEnum.Cash]: 'Cash 💵',
    [PaymentMethodEnum.Visa]: 'Card / Visa 💳',
    [PaymentMethodEnum.Other]: 'Other',
};

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ExtraChargeDto {
    id: number;
    reservationId: number;
    description: string;
    amount: number;
    date: string; // ISO date-time string
    currencyCode: CurrencyCodeValue;
    paymentStatus: PaymentStatusValue;
    /** Cash-only extra charges affect the physical Net Cash in Drawer metric. */
    paymentMethod: PaymentMethodValue;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export interface CreateExtraChargeCommand {
    reservationId: number;
    description: string;
    amount: number;
    date: string; // ISO date-time string (yyyy-MM-ddTHH:mm:ss)
    currencyCode: CurrencyCodeValue;
    paymentStatus: PaymentStatusValue;
    /** Defaults to Cash on the backend if omitted, but always send explicitly. */
    paymentMethod: PaymentMethodValue;
}
