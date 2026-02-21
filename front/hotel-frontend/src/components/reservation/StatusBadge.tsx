import { useTranslation } from 'react-i18next';
import { ReservationStatus } from '@/api/types/reservations';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<ReservationStatus, { style: string; labelKey: string }> = {
    [ReservationStatus.Confirmed]: {
        style: "bg-blue-50 text-blue-600 border-blue-100",
        labelKey: 'status.confirmed'
    },
    [ReservationStatus.Draft]: {
        style: "bg-slate-100 text-slate-600 border-slate-200",
        labelKey: 'status.draft'
    },
    [ReservationStatus.CheckedIn]: {
        style: "bg-emerald-50 text-emerald-600 border-emerald-100",
        labelKey: 'status.checked_in'
    },
    [ReservationStatus.CheckedOut]: {
        style: "bg-purple-50 text-purple-600 border-purple-100",
        labelKey: 'status.checked_out'
    },
    [ReservationStatus.Cancelled]: {
        style: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: 'status.cancelled'
    },
    [ReservationStatus.NoShow]: {
        style: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: 'status.no_show'
    }
};

interface StatusBadgeProps {
    status: ReservationStatus;
    className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
    const { t } = useTranslation();
    const config = STATUS_CONFIG[status] || {
        style: "bg-slate-50 text-slate-400 border-slate-100",
        labelKey: 'status.unknown'
    };

    return (
        <span className={cn(
            `inline-flex px-1.5 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-widest border h-fit`,
            config.style,
            className
        )}>
            {t(config.labelKey)}
        </span>
    );
};
