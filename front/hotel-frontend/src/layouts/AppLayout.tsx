import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

const AppLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    useEffect(() => {
        const metaThemeColor = document.getElementById('theme-color-meta');
        if (metaThemeColor) {
            // If sidebar is open on mobile, change status bar to dark to match sidebar
            if (sidebarOpen && window.innerWidth < 1024) {
                metaThemeColor.setAttribute('content', '#0f172a'); // slate-900
            } else {
                metaThemeColor.setAttribute('content', '#ffffff'); // white bg based on AppLayout/Header
            }
        }
    }, [sidebarOpen, location.pathname]);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <Header onMenuClick={toggleSidebar} />

                {/* Page content — extra bottom padding on mobile for BottomNav */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-32 lg:pb-6">
                    <Outlet />
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
        </div>
    );
};

export default AppLayout;

