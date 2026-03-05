import { useState, useEffect } from 'react';

/**
 * Provides a synchronized current time that ticks at a specified interval.
 * Default tick is 1 minute (60,000ms), sufficient for "Late Checkout" UI tracking
 * without causing excessive React re-renders.
 */
export const useCurrentTime = (intervalMs: number = 60000): Date => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        // Aligns the interval to hit exactly on the minute mark for cleaner updates
        const msUntilNextMinute = 60000 - (new Date().getSeconds() * 1000 + new Date().getMilliseconds());

        let intervalId: ReturnType<typeof setInterval>;

        const timeoutId = setTimeout(() => {
            setCurrentTime(new Date());
            intervalId = setInterval(() => setCurrentTime(new Date()), intervalMs);
        }, msUntilNextMinute);

        return () => {
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [intervalMs]);

    return currentTime;
};
