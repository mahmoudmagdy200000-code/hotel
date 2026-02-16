import type { CurrencyCodeValue, PaymentMethodValue } from './reservations';

export const ExpenseCategoryEnum = {
    Maintenance: 1,
    Purchases: 2,
    Breakfast: 3,
    Other: 4
} as const;

export type ExpenseCategoryValue = typeof ExpenseCategoryEnum[keyof typeof ExpenseCategoryEnum];

export const ExpenseCategoryLabels: Record<ExpenseCategoryValue, string> = {
    [ExpenseCategoryEnum.Maintenance]: 'Maintenance',
    [ExpenseCategoryEnum.Purchases]: 'Purchases',
    [ExpenseCategoryEnum.Breakfast]: 'Breakfast',
    [ExpenseCategoryEnum.Other]: 'Other'
};

export interface ExpenseDto {
    id: number;
    businessDate: string;
    category: ExpenseCategoryValue;
    amount: number;
    currencyCode: CurrencyCodeValue;
    currencyOther?: string;
    paymentMethod: PaymentMethodValue;
    description: string;
    vendor?: string;
    created: string;
}

export interface CreateExpenseCommand {
    businessDate: string;
    category: ExpenseCategoryValue;
    amount: number;
    currencyCode: CurrencyCodeValue;
    currencyOther?: string;
    paymentMethod: PaymentMethodValue;
    description: string;
    vendor?: string;
}

export interface GetExpensesParams {
    from?: string;
    to?: string;
    category?: ExpenseCategoryValue;
    currency?: CurrencyCodeValue;
}
