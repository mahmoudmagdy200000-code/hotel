import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '@/layouts/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ReceptionToday from '@/pages/reception/ReceptionToday';
import PendingRequests from '@/pages/reception/PendingRequests';
import ReservationsList from '@/pages/reservations/ReservationsList';
import ReservationDetails from '@/pages/reservations/ReservationDetails';
import ReservationCreate from '@/pages/reservations/ReservationCreate';
import ReceptionSearch from '@/pages/ReceptionSearch';
import Rooms from '@/pages/Rooms';
import RoomTypes from '@/pages/RoomTypes';
import Occupancy from '@/pages/Occupancy';
import Financials from '@/pages/Financials';
import Expenses from '@/pages/Expenses';
import Login from '@/pages/Login';
import AuditDeletes from '@/pages/admin/AuditDeletes';
import Listings from '@/pages/admin/Listings';
import UserManagement from '@/pages/admin/UserManagement';
import NotFound from '@/pages/NotFound';
import { ProtectedRoute } from '@/components/routes/ProtectedRoute';
import { AdminRoute } from '@/components/routes/AdminRoute';
import { OwnerRoute } from '@/components/routes/OwnerRoute';
import { useAuth } from '@/hooks/useAuth';

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
                element: <Dashboard />,
            },
            {
                path: 'reception/today',
                element: <ReceptionToday />,
            },
            {
                path: 'reception/reservations/:id',
                element: <ReservationDetails />,
            },
            {
                path: 'reception/search',
                element: <ReceptionSearch />,
            },
            {
                path: 'reception/pending',
                element: <PendingRequests />,
            },
            {
                path: 'reservations',
                element: <ReservationsList />,
            },
            {
                path: 'reservations/new',
                element: <ReservationCreate />,
            },
            {
                path: 'reservations/:id',
                element: <ReservationDetails />,
            },
            {
                path: 'rooms',
                element: <Rooms />,
            },
            {
                path: 'room-types',
                element: <RoomTypes />,
            },
            {
                path: 'occupancy',
                element: <Occupancy />,
            },
            {
                path: 'financials',
                element: <Financials />,
            },
            {
                path: 'expenses',
                element: <Expenses />,
            },
            {
                path: 'admin/audit/deletes',
                element: (
                    <AdminRoute>
                        <AuditDeletes />
                    </AdminRoute>
                ),
            },
            {
                path: 'admin/listings',
                element: (
                    <AdminRoute>
                        <Listings />
                    </AdminRoute>
                ),
            },
            {
                path: 'admin/users',
                element: (
                    <OwnerRoute>
                        <UserManagement />
                    </OwnerRoute>
                ),
            },
        ],
    },
    {
        path: '*',
        element: <NotFound />,
    },
]);

export default router;
