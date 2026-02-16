import {
    LayoutDashboard,
    Hotel,
    Search,
    History,
    CalendarDays,
    DoorOpen,
    Tag,
    TrendingUp,
    DollarSign,
    Receipt,
    Users
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    path?: string;
    label: string;
    icon: React.ReactNode;
    roles?: string[];
    children?: Omit<NavItem, 'children'>[];
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const userRole = user?.role || 'Receptionist';

    const navItems: NavItem[] = [
        { path: '/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={20} />, roles: ['Administrator', 'Owner'] },
        {
            label: t('nav.reception'),
            icon: <Hotel size={20} />, // Added icon for parent
            roles: ['Administrator', 'Owner', 'Receptionist'],
            children: [
                { path: '/reception/today', label: t('nav.reception_today'), icon: <Hotel size={18} /> },
                { path: '/reception/search', label: t('nav.search'), icon: <Search size={18} /> },
                { path: '/reception/pending', label: t('nav.pending'), icon: <History size={18} /> },
            ]
        },
        { path: '/reservations', label: t('nav.reservations'), icon: <CalendarDays size={20} />, roles: ['Administrator', 'Owner', 'Receptionist'] },
        { path: '/rooms', label: t('nav.rooms'), icon: <DoorOpen size={20} />, roles: ['Administrator', 'Owner'] },
        { path: '/room-types', label: t('nav.room_types'), icon: <Tag size={20} />, roles: ['Administrator', 'Owner'] },
        { path: '/occupancy', label: t('nav.occupancy'), icon: <TrendingUp size={20} />, roles: ['Administrator', 'Owner', 'Receptionist'] },
        { path: '/financials', label: t('nav.financials'), icon: <DollarSign size={20} />, roles: ['Administrator', 'Owner'] },
        { path: '/expenses', label: t('nav.expenses', 'Expenses'), icon: <Receipt size={20} />, roles: ['Administrator', 'Owner'] },
        { path: '/admin/users', label: t('nav.users', 'Users'), icon: <Users size={20} />, roles: ['Administrator', 'Owner'] },
        { path: '/admin/listings', label: t('nav.admin_listings'), icon: <Tag size={20} />, roles: ['Administrator', 'Owner'] },
        { path: '/admin/audit/deletes', label: t('nav.admin_audit'), icon: <History size={20} />, roles: ['Administrator', 'Owner'] },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (!item.roles) return true;
        return item.roles.includes(userRole);
    });



    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 start-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out",
                    isOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full lg:!transform-none"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
                        <h1 className="text-xl font-bold">Hotel PMS</h1>
                        <button
                            onClick={onClose}
                            className="lg:hidden text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4">
                        <ul className="space-y-1 px-3">
                            {filteredNavItems.map((item, index) => (
                                <li key={index}>

                                    {item.path ? (
                                        <NavLink
                                            to={item.path!}
                                            className={({ isActive }: { isActive: boolean }) =>
                                                cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                                                    isActive
                                                        ? "bg-slate-800 text-white"
                                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                                )
                                            }
                                            onClick={() => {
                                                if (window.innerWidth < 1024) onClose();
                                            }}
                                        >
                                            <span className="shrink-0">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </NavLink>
                                    ) : (
                                        <>
                                            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-3">
                                                <span className="shrink-0">{item.icon}</span>
                                                <span>{item.label}</span>
                                            </div>
                                            {item.children && (
                                                <ul className="space-y-1 mt-1">
                                                    {item.children.map((child, childIndex) => (
                                                        <li key={childIndex}>
                                                            <NavLink
                                                                to={child.path!}
                                                                className={({ isActive }: { isActive: boolean }) =>
                                                                    cn(
                                                                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ms-2",
                                                                        isActive
                                                                            ? "bg-slate-800 text-white"
                                                                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                                                    )
                                                                }
                                                                onClick={() => {
                                                                    if (window.innerWidth < 1024) onClose();
                                                                }}
                                                            >
                                                                <span>{child.icon}</span>
                                                                <span>{child.label}</span>
                                                            </NavLink>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
