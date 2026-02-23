import { formatInTimeZone } from 'date-fns-tz';

export const HOTEL_TIMEZONE = 'Africa/Cairo';

/**
 * Formats a date string or Date object natively into the Egypt Standard Time context.
 * 
 * @param date - The Date object or ISO string to format.
 * @param formatStr - The date-fns format string (e.g. 'MMM dd, yyyy HH:mm').
 * @returns The formatted date string evaluated in African/Cairo timezone.
 */
export const formatHotelTime = (date: Date | string | null | undefined, formatStr = 'MMM dd, yyyy'): string => {
    if (!date) return '';
    return formatInTimeZone(date, HOTEL_TIMEZONE, formatStr);
};

/**
 * Gets the current time in the Hotel timezone.
 */
export const getHotelNow = (): Date => {
    return new Date(); // The browser Date obj is local, but we'll format it relative to the timezone explicitly.
};
