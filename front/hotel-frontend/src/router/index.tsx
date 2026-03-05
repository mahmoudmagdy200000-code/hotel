import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/routes/ProtectedRoute';
import { AdminRoute } from '@/components/routes/AdminRoute';
import { OwnerRoute } from '@/components/routes/OwnerRoute';
import { useAuth } from '@/hooks/useAuth';
import { RouteErrorBoundary } from '@/components/errors/RouteErrorBoundary';
import { lazyWithRetry } from '@/utils/lazyWithRetry';

// ─── Critical path (eagerly loaded) ────────────────────────────
import ReceptionToday from '@/pages/reception/ReceptionToday';
import Login from '@/pages/Login';

// ─── Lazy-loaded pages (code-split) ────────────────────────────
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard'));
const PendingRequests = lazyWithRetry(() => import('@/pages/reception/PendingRequests'));
const ReservationsList = lazyWithRetry(() => import('@/pages/reservations/ReservationsList'));
const ReservationDetails = lazyWithRetry(() => import('@/pages/reservations/ReservationDetails'));
const ReservationCreate = lazyWithRetry(() => import('@/pages/reservations/ReservationCreate'));
const ReceptionSearch = lazyWithRetry(() => import('@/pages/ReceptionSearch'));
const Rooms = lazyWithRetry(() => import('@/pages/Rooms'));
const RoomTypes = lazyWithRetry(() => import('@/pages/RoomTypes'));
const Occupancy = lazyWithRetry(() => import('@/pages/Occupancy'));
const Financials = lazyWithRetry(() => import('@/pages/Financials'));
const Expenses = lazyWithRetry(() => import('@/pages/Expenses'));
const AuditDeletes = lazyWithRetry(() => import('@/pages/admin/AuditDeletes'));
const Listings = lazyWithRetry(() => import('@/pages/admin/Listings'));
const UserManagement = lazyWithRetry(() => import('@/pages/admin/UserManagement'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));

// ─── Suspense wrapper with minimal loading state ────────────────
function LazyPage({ children }: { children: React.ReactNode }) {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
            }
        >
            {children}
        </Suspense>
    );
}

/** Redirects based on user role: Receptionist → Reception Today, others → Dashboard */
function RoleRedirect() {
    const { user } = useAuth();
    if (user?.role === 'Receptionist') {
        return <Navigate to="/reception/today" replace />;
    }
    return <Navigate to="/dashboard" replace />;
}

const router = createBrowserRouter([
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <AppLayout />
            </ProtectedRoute>
        ),
        errorElement: <RouteErrorBoundary />,
        children: [
            {
                index: true,
                element: <RoleRedirect />,
            },
            {
                path: 'dashboard',
                element: <LazyPage><Dashboard /></LazyPage>,
            },
            {
                path: 'reception/today',
                element: <ReceptionToday />,
            },
            {
                path: 'reception/reservations/:id',
                element: <LazyPage><ReservationDetails /></LazyPage>,
            },
            {
                path: 'reception/search',
                element: <LazyPage><ReceptionSearch /></LazyPage>,
            },
            {
                path: 'reception/pending',
                element: <LazyPage><PendingRequests /></LazyPage>,
            },
            {
                path: 'reservations',
                element: <LazyPage><ReservationsList /></LazyPage>,
            },
            {
                path: 'reservations/new',
                element: <LazyPage><ReservationCreate /></LazyPage>,
            },
            {
                path: 'reservations/:id',
                element: <LazyPage><ReservationDetails /></LazyPage>,
            },
            {
                path: 'rooms',
                element: <LazyPage><Rooms /></LazyPage>,
            },
            {
                path: 'room-types',
                element: <LazyPage><RoomTypes /></LazyPage>,
            },
            {
                path: 'occupancy',
                element: <LazyPage><Occupancy /></LazyPage>,
            },
            {
                path: 'financials',
                element: <LazyPage><Financials /></LazyPage>,
            },
            {
                path: 'expenses',
                element: <LazyPage><Expenses /></LazyPage>,
            },
            {
                path: 'admin/audit/deletes',
                element: (
                    <AdminRoute>
                        <LazyPage><AuditDeletes /></LazyPage>
                    </AdminRoute>
                ),
            },
            {
                path: 'admin/listings',
                element: (
                    <AdminRoute>
                        <LazyPage><Listings /></LazyPage>
                    </AdminRoute>
                ),
            },
            {
                path: 'admin/users',
                element: (
                    <OwnerRoute>
                        <LazyPage><UserManagement /></LazyPage>
                    </OwnerRoute>
                ),
            },
        ],
    },
    {
        path: '*',
        element: <LazyPage><NotFound /></LazyPage>,
    },
]);

export default router;
