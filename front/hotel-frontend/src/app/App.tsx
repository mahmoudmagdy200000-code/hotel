import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from '@/hooks/useAuth';
import { BusinessDateProvider } from './providers/BusinessDateProvider';
import { GlobalDateProvider } from './providers/GlobalDateProvider';
import router from '@/router';

import { Toaster } from '@/components/ui/sonner';
import { PwaPrompt } from '@/components/PwaPrompt';
import { PwaUpdater } from '@/hooks/usePwaManager';

function App() {
    return (
        <QueryProvider>
            <AuthProvider>
                <BusinessDateProvider>
                    <GlobalDateProvider>
                        <RouterProvider router={router} />
                        <Toaster />
                        <PwaPrompt />
                        <PwaUpdater />
                    </GlobalDateProvider>
                </BusinessDateProvider>
            </AuthProvider>
        </QueryProvider>
    );
}

export default App;
