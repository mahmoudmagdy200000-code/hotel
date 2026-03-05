import React from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const RouteErrorBoundary: React.FC = () => {
    const error = useRouteError();

    // Helper to reliably identify dynamic import errors
    const isChunkLoadError = (err: unknown): boolean => {
        if (err instanceof Error) {
            return (
                err.message.includes('Failed to fetch dynamically imported module') ||
                err.message.includes('Importing a module script failed')
            );
        }
        return false;
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    // 1. Specific UI corresponding to Vercel chunk errors
    if (isChunkLoadError(error)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center font-sans">
                <div className="bg-orange-100 p-4 rounded-full mb-6">
                    <RefreshCw className="w-10 h-10 text-orange-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    App Update Available
                </h2>
                <p className="text-gray-600 max-w-md mb-8">
                    We've just released a new version of the app to improve your experience.
                    Please refresh to load the latest components.
                </p>
                <button
                    onClick={handleRefresh}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    // 2. Generic UI for standard router 404s/500s or standard unhandled errors
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center font-sans">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
            </h2>
            <p className="text-gray-600 max-w-md mb-6">
                {isRouteErrorResponse(error)
                    ? `${error.status} - ${error.statusText}`
                    : error instanceof Error
                        ? error.message
                        : 'An unexpected application error occurred.'}
            </p>
            <button
                onClick={handleRefresh}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-md font-medium border border-gray-300 transition-colors"
            >
                Try Again
            </button>
        </div>
    );
};
