import {
    LayoutDashboard,
    Hotel,
    Search,
    History,
    CalendarDays,
    DoorOpen,
    Tag,
    TrendingUp,
    Receipt,
    Users,
    Settings,
    LogOut,
    Shield,
    BarChart3,
    ArrowUpRight
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}



const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const userRole = user?.role || 'Receptionist';

    const navigation = {
        main: [
            { path: '/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={18} strokeWidth={2.5} />, roles: ['Administrator', 'Owner'] },
        ],
        operations: [
            { path: '/reception/today', label: t('nav.reception_today'), icon: <Hotel size={18} />, roles: ['Administrator', 'Owner', 'Receptionist'] },
            { path: '/reservations', label: t('nav.reservations'), icon: <CalendarDays size={18} />, roles: ['Administrator', 'Owner', 'Receptionist'] },
            { path: '/reception/pending', label: t('nav.pending'), icon: <History size={18} />, roles: ['Administrator', 'Owner', 'Receptionist'] },
            { path: '/reception/search', label: t('nav.search'), icon: <Search size={18} />, roles: ['Administrator', 'Owner', 'Receptionist'] },
        ],
        intelligence: [
            { path: '/occupancy', label: t('nav.occupancy'), icon: <BarChart3 size={18} />, roles: ['Administrator', 'Owner', 'Receptionist'] },
            { path: '/financials', label: t('nav.financials'), icon: <TrendingUp size={18} />, roles: ['Administrator', 'Owner'] },
            { path: '/expenses', label: t('nav.expenses', 'Expenses'), icon: <Receipt size={18} />, roles: ['Administrator', 'Owner'] },
        ],
        administrative: [
            { path: '/admin/users', label: t('nav.users', 'Users'), icon: <Users size={18} strokeWidth={2.5} />, roles: ['Administrator', 'Owner'] },
            { path: '/admin/listings', label: t('nav.admin_listings'), icon: <Tag size={18} strokeWidth={2.5} />, roles: ['Administrator', 'Owner'] },
            { path: '/admin/audit/deletes', label: t('nav.admin_audit'), icon: <Shield size={18} strokeWidth={2.5} />, roles: ['Administrator', 'Owner'] },
            { path: '/rooms', label: t('nav.rooms'), icon: <DoorOpen size={18} />, roles: ['Administrator', 'Owner'] },
            { path: '/room-types', label: t('nav.room_types'), icon: <Tag size={18} />, roles: ['Administrator', 'Owner'] },
        ]
    };

    const filterItems = (items: any[]) => items.filter(item => !item.roles || item.roles.includes(userRole));

    const NavGroup = ({ title, items }: { title: string, items: any[] }) => {
        const filtered = filterItems(items);
        if (filtered.length === 0) return null;

        return (
            <div className="mb-6">
                <div className="px-5 mb-2 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</span>
                    <div className="h-px flex-1 bg-slate-800/50" />
                </div>
                <ul className="space-y-1 px-3">
                    {filtered.map((item, idx) => (
                        <li key={idx}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    cn(
                                        "group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300",
                                        isActive
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                            : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                                    )
                                }
                                onClick={() => {
                                    if (window.innerWidth < 1024) onClose();
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "shrink-0 transition-transform duration-300 group-hover:scale-110",
                                        "text-blue-400 group-[.bg-blue-600]:text-white"
                                    )}>
                                        {item.icon}
                                    </span>
                                    <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                                </div>
                                <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };



    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed lg:static inset-y-0 start-0 z-50 w-72 bg-slate-900 border-e border-slate-800 text-white transform transition-all duration-300 ease-in-out",
                    isOpen ? "translate-x-0 shadow-2xl shadow-blue-500/10" : "ltr:-translate-x-full rtl:translate-x-full lg:!transform-none"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between h-20 px-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Hotel className="text-white w-5 h-5" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-sm font-black tracking-tighter text-white">RAS SEDR</span>
                                <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Property Mgmt</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto pt-2 pb-6 custom-scrollbar">
                        <NavGroup title="Systems" items={navigation.main} />
                        <NavGroup title="Operations" items={navigation.operations} />
                        <NavGroup title="Intelligence" items={navigation.intelligence} />
                        <NavGroup title="Management" items={navigation.administrative} />
                    </nav>

                    {/* User Profile Footer */}
                    <div className="p-4 border-t border-slate-800">
                        <div className="bg-slate-800/40 rounded-2xl p-3 border border-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                                <Settings className="text-blue-400 w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">
                                    {user?.name || 'Operator'}
                                </p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {userRole}
                                </p>
                            </div>
                            <button
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors text-slate-500 hover:text-red-400"
                                title="Lock System"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
