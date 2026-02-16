import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from '@/i18n';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function isValidYYYYMMDD(date: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
    // Basic normalization for common non-ISO codes and symbols
    const currencyMap: Record<string, string> = {
        'LE': 'EGP',
        'E.G.P': 'EGP',
        'L.E': 'EGP',
        'US$': 'USD',
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        'DOLLAR': 'USD',
        'EURO': 'EUR'
    };

    let safeCurrency = (currency || 'USD').toUpperCase().trim();
    if (currencyMap[safeCurrency]) {
        safeCurrency = currencyMap[safeCurrency];
    }

    // Guard: if still invalid or literal 'string'
    if (safeCurrency === 'STRING' || safeCurrency === '') safeCurrency = 'USD';

    try {
        return new Intl.NumberFormat(i18n.language || 'en-US', {
            style: 'currency',
            currency: safeCurrency,
        }).format(amount);
    } catch {
        console.warn(`Fallback formatting for invalid currency: ${currency}`);
        // Fallback: [Amount] [Currency] (e.g. 100.00 LE)
        return `${amount.toLocaleString(i18n.language || 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    }
}

export function extractErrorMessage(err: unknown): string {
    // Handle non-object errors
    if (!err || typeof err !== 'object') {
        return String(err) || 'Operation failed';
    }

    // Type guard for axios-like error shape
    const axiosErr = err as { response?: { data?: { detail?: string; errors?: Record<string, string[]>; title?: string } }; message?: string };

    if (!axiosErr.response?.data) return axiosErr.message || 'Operation failed';

    const data = axiosErr.response.data;

    // 1. Check for ProblemDetails/ValidationProblemDetails 'detail'
    if (data.detail) return data.detail;

    // 2. Check for ValidationProblemDetails 'errors' dictionary
    if (data.errors && typeof data.errors === 'object') {
        const errorList = Object.values(data.errors).flat();
        if (errorList.length > 0) return errorList[0] as string;
    }

    // 3. Fallback to title
    if (data.title) return data.title;

    return axiosErr.message || 'Operation failed';
}
