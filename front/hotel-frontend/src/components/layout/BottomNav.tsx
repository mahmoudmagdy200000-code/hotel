import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Hotel, Search, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

/**
 * Mobile-only fixed Bottom Navigation Bar
 * Provides single-handed access to the 4 most-used screens.
 * Hidden on desktop (lg+).
 */
const BottomNav = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const location = useLocation();
    const role = user?.role || 'Receptionist';

    const items = [
        {
            path: '/dashboard',
            label: t('nav.dashboard'),
            icon: LayoutDashboard,
            roles: ['Administrator', 'Owner'],
        },
        {
            path: '/reception/today',
            label: t('nav.reception_today'),
            icon: Hotel,
            roles: ['Administrator', 'Owner', 'Receptionist'],
        },
        {
            path: '/reception/search',
            label: t('nav.search'),
            icon: Search,
            roles: ['Administrator', 'Owner', 'Receptionist'],
        },
        {
            path: '/reservations',
            label: t('nav.reservations'),
            icon: CalendarDays,
            roles: ['Administrator', 'Owner', 'Receptionist'],
        },
    ].filter(item => item.roles.includes(role));

    return (
        <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden">
            {/* Frosted glass effect */}
            <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-stretch justify-around h-16 px-2 max-w-md mx-auto">
                    {items.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative group"
                            >
                                {/* Active indicator pill */}
                                {isActive && (
                                    <span className="absolute top-0 w-8 h-0.5 rounded-full bg-blue-600 animate-in fade-in slide-in-from-top-1 duration-200" />
                                )}
                                <span className={cn(
                                    "p-1.5 rounded-xl transition-all duration-200",
                                    isActive
                                        ? "bg-blue-600/10 text-blue-600 scale-110"
                                        : "text-slate-400 group-active:scale-90"
                                )}>
                                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                                </span>
                                <span className={cn(
                                    "text-[9px] font-bold tracking-wide transition-colors duration-200 leading-none",
                                    isActive
                                        ? "text-blue-600 font-black"
                                        : "text-slate-400"
                                )}>
                                    {item.label}
                                </span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>
            {/* Safe area spacer for notched phones */}
            <div className="bg-white/80 backdrop-blur-xl h-[env(safe-area-inset-bottom)]" />
        </nav>
    );
};

export default BottomNav;
