import type { CurrencyCodeValue, PaymentMethodValue } from './reservations';

export const ExpenseCategoryEnum = {
    Maintenance: 1,
    Purchases: 2,
    Breakfast: 3,
    Other: 4,
    Salaries: 5,
    Utilities: 6,
    Delivery: 7,
    Commission: 8,
    ElectricityBill: 9,
    WaterBill: 10
} as const;

export type ExpenseCategoryValue = typeof ExpenseCategoryEnum[keyof typeof ExpenseCategoryEnum];

export const ExpenseCategoryLabels: Record<ExpenseCategoryValue, string> = {
    [ExpenseCategoryEnum.Maintenance]: 'expenses.categories.maintenance',
    [ExpenseCategoryEnum.Purchases]: 'expenses.categories.purchases',
    [ExpenseCategoryEnum.Breakfast]: 'expenses.categories.breakfast',
    [ExpenseCategoryEnum.Other]: 'expenses.categories.other',
    [ExpenseCategoryEnum.Salaries]: 'expenses.categories.salaries',
    [ExpenseCategoryEnum.Utilities]: 'expenses.categories.utilities',
    [ExpenseCategoryEnum.Delivery]: 'expenses.categories.delivery',
    [ExpenseCategoryEnum.Commission]: 'expenses.categories.commission',
    [ExpenseCategoryEnum.ElectricityBill]: 'expenses.categories.electricity_bill',
    [ExpenseCategoryEnum.WaterBill]: 'expenses.categories.water_bill'
};

/**
 * Returns the i18n translation key for a given expense category.
 * Following DRY principle to avoid manual label mapping elsewhere.
 */
export const getExpenseCategoryTranslationKey = (value: ExpenseCategoryValue): string => {
    return ExpenseCategoryLabels[value] || 'expenses.categories.other';
};

/**
 * Array of all valid expense category IDs for UI iteration.
 */
export const expenseCategoryValues = Object.values(ExpenseCategoryEnum) as ExpenseCategoryValue[];

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
