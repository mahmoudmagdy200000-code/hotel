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

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface ExtraChargeDto {
    id: number;
    reservationId: number;
    description: string;
    amount: number;
    date: string; // ISO date-time string
    currencyCode: CurrencyCodeValue;
    paymentStatus: PaymentStatusValue;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

export interface CreateExtraChargeCommand {
    reservationId: number;
    description: string;
    amount: number;
    date: string; // ISO date-time string (yyyy-MM-ddTHH:mm:ss)
    currencyCode: CurrencyCodeValue;
    paymentStatus: PaymentStatusValue;
}
