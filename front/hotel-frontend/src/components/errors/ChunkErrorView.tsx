import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Route-Level Error Boundary designed to detect if a chunk failed to load.
 * Displays a fallback UI incorporating Cache-Busting Reload logic.
 */
export const ChunkErrorView: React.FC = () => {
    const error = useRouteError();

    // Reliable identification of chunk load errors
    const isChunkLoadError = (err: unknown): boolean => {
        if (err instanceof Error) {
            return (
                err.message.includes('Failed to fetch dynamically imported module') ||
                err.message.includes('Importing a module script failed')
            );
        }
        return false;
    };

    const handleCacheBustingReload = () => {
        // Force the browser to bypass memory/disk cache for the main index.html
        const url = new URL(window.location.href);
        url.searchParams.set('v', Date.now().toString());
        window.location.href = url.toString();
    };

    if (isChunkLoadError(error)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8 text-center font-sans">
                <div className="bg-orange-100 p-4 rounded-full mb-6">
                    <RefreshCw className="w-10 h-10 text-orange-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">
                    Update Required
                </h2>
                <p className="text-slate-600 max-w-md mb-8 font-medium">
                    A new version of the application has been released.
                    Please apply the update to load the latest securely.
                </p>
                <button
                    onClick={handleCacheBustingReload}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg active:scale-95"
                >
                    Apply Update
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8 text-center font-sans">
            <div className="bg-red-100 p-4 rounded-full mb-6">
                <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight">
                Application Error
            </h2>
            <p className="text-slate-600 max-w-md mb-8 font-medium">
                {isRouteErrorResponse(error)
                    ? `${error.status} - ${error.statusText}`
                    : error instanceof Error
                        ? error.message
                        : 'An unexpected application error occurred.'}
            </p>
            <button
                onClick={() => window.location.reload()}
                className="bg-slate-200 hover:bg-slate-300 text-slate-900 px-8 py-3 rounded-xl font-black uppercase tracking-widest transition-colors active:scale-95"
            >
                Try Again
            </button>
        </div>
    );
};
