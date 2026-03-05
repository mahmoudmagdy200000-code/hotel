import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

/**
 * Hook to manage PWA Service Worker updates and provide a clean UX
 * without exposing raw SW logic to the application root.
 */
export const usePwaManager = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisterError(error) {
            console.error('[PWA] Service worker registration error', error);
        },
    });

    useEffect(() => {
        if (offlineReady) {
            toast.success('App is ready to work offline.', {
                id: 'pwa-offline-ready',
                onDismiss: () => setOfflineReady(false),
                onAutoClose: () => setOfflineReady(false)
            });
        }
    }, [offlineReady, setOfflineReady]);

    useEffect(() => {
        if (needRefresh) {
            toast('New System Update Available', {
                id: 'pwa-update-available',
                description: 'A new version of the application has been deployed. Please apply the update to continue without errors.',
                duration: Infinity,
                // Make the toast persistent and not dismissible by swipe to force the user to see it
                dismissible: false,
                action: {
                    label: 'Apply Update',
                    onClick: () => {
                        // This removes the block and installs the new service worker
                        // Passing true forces an immediate reload after the SW activates.
                        updateServiceWorker(true);
                    },
                },
                cancel: {
                    label: 'Later',
                    onClick: () => setNeedRefresh(false)
                }
            });
        }
    }, [needRefresh, setNeedRefresh, updateServiceWorker]);

    return { needRefresh, updateServiceWorker };
};

/**
 * Headless component to drop into the App tree to initialize the PWA manager
 */
export const PwaUpdater = () => {
    usePwaManager();
    return null;
};
