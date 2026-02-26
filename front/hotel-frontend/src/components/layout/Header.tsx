import { Menu, Bell, CalendarDays, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import LanguageToggle from '@/components/layout/LanguageToggle';
import BranchSelector from '@/components/layout/BranchSelector';
import { DatePicker } from '@/components/ui/date-picker';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';
import { parseISO, format } from 'date-fns';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const userRole = user?.role || 'Receptionist';
    const { businessDate, setBusinessDate } = useBusinessDate();

    return (
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
            {/* Left: Menu button (mobile) */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                    aria-label="Toggle menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="hidden lg:block">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Control Center</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Node 01</p>
                </div>
            </div>

            {/* Right: User actions */}
            <div className="flex items-center gap-3 lg:gap-6">
                <div className="hidden lg:block">
                    <BranchSelector />
                </div>

                {/* Business Date Selector */}
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200/60 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                        <CalendarDays className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                            {t('header.business_date', 'Business Date')}
                        </span>
                        <DatePicker
                            date={parseISO(businessDate)}
                            setDate={(d) => setBusinessDate(d ? format(d, 'yyyy-MM-dd') : businessDate)}
                            className="border-none h-auto p-0 bg-transparent text-[11px] font-black text-slate-900 focus-visible:ring-0 shadow-none hover:text-blue-600 transition-colors"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <LanguageToggle />

                    {/* Notifications */}
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all relative group" title={t('header.notifications')}>
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white group-hover:animate-pulse"></span>
                    </button>
                </div>

                {/* User Identity */}
                <div className="flex items-center gap-3 pl-4 lg:pl-6 border-l border-slate-100">
                    <div className="hidden md:flex flex-col text-right">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                            {user?.name || 'Operator'}
                        </p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">
                            {userRole}
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg shadow-slate-900/20 group cursor-pointer overflow-hidden relative">
                        <span className="text-xs font-black text-white group-hover:opacity-0 transition-opacity">
                            {user?.name?.substring(0, 2).toUpperCase() || 'OP'}
                        </span>
                        <div
                            className="absolute inset-0 bg-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={logout}
                            title={t('header.logout')}
                        >
                            <LogOut className="w-4 h-4 text-white" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};


export default Header;
