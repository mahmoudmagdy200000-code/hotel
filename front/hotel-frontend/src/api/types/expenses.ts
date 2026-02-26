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
