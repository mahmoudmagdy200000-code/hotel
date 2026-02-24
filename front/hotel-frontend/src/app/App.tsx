import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from '@/hooks/useAuth';
import { BusinessDateProvider } from './providers/BusinessDateProvider';
import router from '@/router';

import { Toaster } from '@/components/ui/sonner';
import { PwaPrompt } from '@/components/PwaPrompt';

function App() {
    return (
        <QueryProvider>
            <AuthProvider>
                <BusinessDateProvider>
                    <RouterProvider router={router} />
                    <Toaster />
                    <PwaPrompt />
                </BusinessDateProvider>
            </AuthProvider>
        </QueryProvider>
    );
}

export default App;
