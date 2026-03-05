import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const COOLDOWN_KEY = 'update-monitor-cooldown';
const COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * Custom hook to monitor for chunk load errors globally (typically caused by deploying 
 * a new version to Vercel while a user has the app open).
 * 
 * Features:
 * - Silent Error Catching: Suppresses browser console bleeding.
 * - Loop Prevention: Enforces a 60s cooldown using sessionStorage before showing the Toast again.
 * - Cache-Busting: Forces a hard fetch from the server.
 */
export const useVersionUpdateMonitor = () => {
    const handleUpdateAvailable = useCallback(() => {
        const lastToastTime = sessionStorage.getItem(COOLDOWN_KEY);
        const now = Date.now();

        // Prevent infinite loops / spam by honoring the cooldown
        if (lastToastTime && now - parseInt(lastToastTime, 10) < COOLDOWN_MS) {
            return;
        }

        sessionStorage.setItem(COOLDOWN_KEY, now.toString());

        toast.error('New System Update Available', {
            id: 'version-update-toast',
            description: 'A new application version has been deployed. Please apply the update to continue without errors.',
            duration: Infinity,
            dismissible: false,
            action: {
                label: 'Apply Update',
                onClick: () => {
                    // Cache-busting reload logic: force browser to bypass memory/disk cache 
                    // for the root index.html to fetch new chunk mappings.
                    const url = new URL(window.location.href);
                    url.searchParams.set('v', Date.now().toString());
                    window.location.href = url.toString();
                },
            },
        });
    }, []);

    useEffect(() => {
        // Handle Vite's specific preload error fallback
        const vitePreloadErrorHandler = (event: Event) => {
            event.preventDefault(); // Silent catching
            handleUpdateAvailable();
        };

        // Handle generic unhandled promise rejections for dynamic imports
        const unhandledRejectionHandler = ((event: PromiseRejectionEvent) => {
            const errorMsg = event.reason?.message || '';
            if (
                errorMsg.includes('Failed to fetch dynamically imported module') ||
                errorMsg.includes('Importing a module script failed')
            ) {
                event.preventDefault(); // Silent catching
                handleUpdateAvailable();
            }
        }) as EventListener;

        window.addEventListener('vite:preloadError', vitePreloadErrorHandler);
        window.addEventListener('unhandledrejection', unhandledRejectionHandler);

        return () => {
            window.removeEventListener('vite:preloadError', vitePreloadErrorHandler);
            window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
        };
    }, [handleUpdateAvailable]);
};
