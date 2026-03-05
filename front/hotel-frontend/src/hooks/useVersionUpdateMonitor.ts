import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Global monitor to catch dynamic chunk load errors (often caused by new deployments).
 * Listens to Vite's specific preload fallback event and general unhandled rejections.
 */
export const useVersionUpdateMonitor = () => {
    const handleUpdateAvailable = useCallback(() => {
        // Prevent duplicate toasts by assigning a static ID
        toast.error('New version is available', {
            id: 'version-update-toast',
            description: 'A new application version has been deployed. Please refresh to continue avoiding errors.',
            duration: Infinity, // Keep open until the user acts
            action: {
                label: 'Refresh Page',
                onClick: () => window.location.reload(),
            },
        });
    }, []);

    useEffect(() => {
        // 1. Vite specific event for chunk preload errors
        const vitePreloadErrorHandler = (event: Event) => {
            event.preventDefault(); // Prevent Vite's default reload to maintain our gentle UX
            handleUpdateAvailable();
        };

        // 2. Fallback for unhandled promise rejections (e.g., standard dynamic import failures)
        const unhandledRejectionHandler = ((event: PromiseRejectionEvent) => {
            const errorMsg = event.reason?.message || '';
            if (
                errorMsg.includes('Failed to fetch dynamically imported module') ||
                errorMsg.includes('Importing a module script failed')
            ) {
                event.preventDefault();
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
