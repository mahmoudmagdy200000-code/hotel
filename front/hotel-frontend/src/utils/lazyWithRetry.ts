import { lazy } from 'react';

// Key used in sessionStorage to track if a reload has already been attempted for a missing chunk
const RELOAD_KEY_PREFIX = 'chunk-reload-';

/**
 * Wraps a dynamic import (React.lazy component) with a retry mechanism.
 * 
 * If a new build is deployed (e.g., to Vercel), old JS chunks are deleted.
 * When an active client tries to navigate to a lazy-loaded route, it requests
 * the old chunk hash which returns 404 (or the fallback HTML), causing the app to crash
 * with "Failed to fetch dynamically imported module".
 *
 * This wrapper catches that error. It forces a window.location.reload() *once*, 
 * which downloads the new index.html with the correct modern chunk hashes.
 *
 * It uses `sessionStorage` to ensure we don't get stuck in an infinite reload loop 
 * if the chunk is genuinely broken for another reason.
 *
 * @param componentImport A function returning a dynamic import `() => import(...)`
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
    componentImport: () => Promise<{ default: T }>
) {
    return lazy(async () => {
        // Derive a unique key for this specific component import attempt based on the URL path.
        // We use window.location.pathname so each route failure is tracked independently.
        const reloadKey = `${RELOAD_KEY_PREFIX}${window.location.pathname}`;

        try {
            const component = await componentImport();
            // If successful, clear any previous failure flags for this path
            window.sessionStorage.removeItem(reloadKey);
            return component;
        } catch (error: any) {
            // Check if the error is related to chunk loading
            const isChunkLoadError =
                error?.message?.includes('Failed to fetch dynamically imported module') ||
                error?.message?.includes('Importing a module script failed');

            const hasReloaded = window.sessionStorage.getItem(reloadKey);

            if (isChunkLoadError && !hasReloaded) {
                console.warn(`[LazyLoad] Chunk missing. Forcing reload to fetch new HTML.`);
                // Mark that we are reloading to avoid infinite loops
                window.sessionStorage.setItem(reloadKey, 'true');
                // Force a hard reload from the server to get the fresh index.html
                window.location.reload();

                // Return a never-resolving promise to halt React's rendering lifecycle
                // while the browser executes the actual reload.
                return new Promise<{ default: T }>(() => { });
            }

            // If it's not a chunk error, or we already tried reloading, throw the error
            // so the RouteErrorBoundary can catch it.
            throw error;
        }
    });
}
