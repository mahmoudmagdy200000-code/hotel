import {
    Wrench, ShoppingCart, Coffee, HelpCircle,
    Banknote, Zap, Truck, Percent, Lightbulb, Droplets
} from 'lucide-react';
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
 * Centralized styles and icons for expense categories.
 * Follows the 'Ras Sedr Rental' design system.
 */
export const CATEGORY_STYLE: Record<number, { icon: any; color: string; bg: string }> = {
    [ExpenseCategoryEnum.Maintenance]: { icon: Wrench, color: 'text-rose-600', bg: 'bg-rose-50' },
    [ExpenseCategoryEnum.Purchases]: { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    [ExpenseCategoryEnum.Breakfast]: { icon: Coffee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    [ExpenseCategoryEnum.Other]: { icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
    [ExpenseCategoryEnum.Salaries]: { icon: Banknote, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    [ExpenseCategoryEnum.Utilities]: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    [ExpenseCategoryEnum.Delivery]: { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-50' },
    [ExpenseCategoryEnum.Commission]: { icon: Percent, color: 'text-purple-600', bg: 'bg-purple-50' },
    [ExpenseCategoryEnum.ElectricityBill]: { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    [ExpenseCategoryEnum.WaterBill]: { icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50' },
};

export const DEFAULT_CATEGORY_STYLE = { icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-50' };

export const getExpenseCategoryStyle = (value: number) => {
    return CATEGORY_STYLE[value] || DEFAULT_CATEGORY_STYLE;
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

export interface ExpensesSummaryDto {
    items: ExpenseDto[];
    totalAmount: number;
}
