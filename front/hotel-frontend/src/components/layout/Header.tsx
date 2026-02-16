import { Menu, Bell, LogOut, CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import LanguageToggle from '@/components/layout/LanguageToggle';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';
import { parseISO, format } from 'date-fns';

interface HeaderProps {
    onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const { businessDate, setBusinessDate } = useBusinessDate();

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6">
            {/* Left: Menu button (mobile) */}
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Toggle menu"
            >
                <Menu className="w-6 h-6 text-slate-600" />
            </button>

            {/* Center: Page title or search (can be enhanced later) */}
            <div className="flex-1 lg:ms-0 ms-4">
                <h2 className="text-lg font-semibold text-slate-800">
                    {t('header.welcome')}
                </h2>
            </div>

            {/* Right: User actions */}
            <div className="flex items-center gap-4">
                {/* Business Date Selector */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:inline">
                        {t('header.business_date', 'Business Date')}:
                    </span>
                    <DatePicker
                        date={parseISO(businessDate)}
                        setDate={(d) => setBusinessDate(d ? format(d, 'yyyy-MM-dd') : businessDate)}
                        className="border-none h-7 px-2 bg-transparent text-sm font-bold text-slate-900 focus-visible:ring-0 shadow-none hover:bg-slate-100 transition-colors"
                    />
                </div>

                <LanguageToggle />

                {/* Notifications */}
                <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors relative" title={t('header.notifications')}>
                    <Bell className="w-6 h-6 text-slate-600" />
                    <span className="absolute top-2.5 end-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                {/* User menu */}
                <div className="flex items-center gap-2 border-s ps-4 border-slate-200">
                    <div className="hidden md:block text-right me-2">
                        <p className="text-sm font-medium text-slate-900">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role || 'Staff'}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center me-2">
                        <span className="text-xs font-bold text-white">
                            {user?.name?.substring(0, 2).toUpperCase() || 'AD'}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={logout}
                        title={t('header.logout')}
                    >
                        <LogOut className="w-4 h-4 text-slate-500 hover:text-red-600 transition-colors" />
                    </Button>
                </div>
            </div>
        </header>
    );
};


export default Header;
