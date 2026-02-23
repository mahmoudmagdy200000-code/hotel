import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppLayout from '@/layouts/AppLayout';
import { ProtectedRoute } from '@/components/routes/ProtectedRoute';
import { AdminRoute } from '@/components/routes/AdminRoute';
import { OwnerRoute } from '@/components/routes/OwnerRoute';
import { useAuth } from '@/hooks/useAuth';

// ─── Critical path (eagerly loaded) ────────────────────────────
import ReceptionToday from '@/pages/reception/ReceptionToday';
import Login from '@/pages/Login';

// ─── Lazy-loaded pages (code-split) ────────────────────────────
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const PendingRequests = lazy(() => import('@/pages/reception/PendingRequests'));
const ReservationsList = lazy(() => import('@/pages/reservations/ReservationsList'));
const ReservationDetails = lazy(() => import('@/pages/reservations/ReservationDetails'));
const ReservationCreate = lazy(() => import('@/pages/reservations/ReservationCreate'));
const ReceptionSearch = lazy(() => import('@/pages/ReceptionSearch'));
const Rooms = lazy(() => import('@/pages/Rooms'));
const RoomTypes = lazy(() => import('@/pages/RoomTypes'));
const Occupancy = lazy(() => import('@/pages/Occupancy'));
const Financials = lazy(() => import('@/pages/Financials'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const AuditDeletes = lazy(() => import('@/pages/admin/AuditDeletes'));
const Listings = lazy(() => import('@/pages/admin/Listings'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const NotFound = lazy(() => import('@/pages/NotFound'));

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
