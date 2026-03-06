import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { QuickFilterType } from '@/hooks/reservations/useReservationFilters';
import {
    LogIn,
    LogOut,
    Home,
    AlertCircle,
    LayoutGrid
} from 'lucide-react';

interface QuickFilterChipsProps {
    activeFilter: QuickFilterType;
    onFilterChange: (filter: QuickFilterType) => void;
    counts: {
        all: number;
        arrivals: number;
        departures: number;
        inHouse: number;
        actionRequired: number;
    };
}

export const QuickFilterChips = ({
    activeFilter,
    onFilterChange,
    counts
}: QuickFilterChipsProps) => {
    const { t } = useTranslation();

    const filters = [
        { id: 'all', label: t('all', 'All'), icon: LayoutGrid, count: counts.all, color: 'bg-slate-500' },
        { id: 'arrivals', label: t('reservations.arrivals_today', 'Arrivals Today'), icon: LogIn, count: counts.arrivals, color: 'bg-emerald-500' },
        { id: 'departures', label: t('reservations.departures_today', 'Departures Today'), icon: LogOut, count: counts.departures, color: 'bg-orange-500' },
        { id: 'in-house', label: t('reservations.in_house', 'In-House'), icon: Home, count: counts.inHouse, color: 'bg-blue-500' },
        { id: 'action-required', label: t('reservations.action_required', 'Action Required'), icon: AlertCircle, count: counts.actionRequired, color: 'bg-rose-500' },
    ] as const;

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar scroll-smooth">
            {filters.map((filter) => {
                const isActive = activeFilter === filter.id;
                const Icon = filter.icon;

                return (
                    <button
                        key={filter.id}
                        onClick={() => onFilterChange(filter.id as QuickFilterType)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all flex-shrink-0 active:scale-95 shadow-sm",
                            isActive
                                ? "bg-slate-900 border-slate-900 text-white shadow-md"
                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        )}
                    >
                        <div className={cn(
                            "flex items-center justify-center w-5 h-5 rounded-lg",
                            isActive ? "bg-white/20" : cn("bg-slate-100", isActive && "bg-white/20")
                        )}>
                            <Icon className={cn("w-3 h-3", isActive ? "text-white" : "text-slate-500")} />
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
                            {filter.label}
                        </span>
                        {filter.count > 0 && (
                            <span className={cn(
                                "flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[9px] font-black",
                                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                            )}>
                                {filter.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};
