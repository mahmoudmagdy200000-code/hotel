import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from '@/hooks/useAuth';
import { BusinessDateProvider } from './providers/BusinessDateProvider';
import router from '@/router';

import { Toaster } from '@/components/ui/sonner';

function App() {
    return (
        <QueryProvider>
            <AuthProvider>
                <BusinessDateProvider>
                    <RouterProvider router={router} />
                    <Toaster />
                </BusinessDateProvider>
            </AuthProvider>
        </QueryProvider>
    );
}

export default App;
