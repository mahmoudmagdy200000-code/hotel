import { useState, useEffect } from 'react';

/**
 * Hook to detect screen sizes safely across CSR/SSR environments.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(false);

    useEffect(() => {
        const mediaQueryList = window.matchMedia(query);

        // Set initial layout value
        setMatches(mediaQueryList.matches);

        // Modern API Listener
        const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
        mediaQueryList.addEventListener('change', listener);

        return () => {
            mediaQueryList.removeEventListener('change', listener);
        };
    }, [query]);

    return matches;
}
