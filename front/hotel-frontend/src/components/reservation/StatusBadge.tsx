import { useTranslation } from 'react-i18next';
import { ReservationStatus } from '@/api/types/reservations';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { style: string; labelKey: string }> = {
    [ReservationStatus.Confirmed]: {
        style: "bg-blue-50 text-blue-600 border-blue-100",
        labelKey: 'confirmed'
    },
    'Confirmed': {
        style: "bg-blue-50 text-blue-600 border-blue-100",
        labelKey: 'confirmed'
    },
    [ReservationStatus.Draft]: {
        style: "bg-slate-100 text-slate-600 border-slate-200",
        labelKey: 'draft'
    },
    'Draft': {
        style: "bg-slate-100 text-slate-600 border-slate-200",
        labelKey: 'draft'
    },
    [ReservationStatus.CheckedIn]: {
        style: "bg-emerald-50 text-emerald-600 border-emerald-100",
        labelKey: 'checked_in'
    },
    'CheckedIn': {
        style: "bg-emerald-50 text-emerald-600 border-emerald-100",
        labelKey: 'checked_in'
    },
    [ReservationStatus.CheckedOut]: {
        style: "bg-purple-50 text-purple-600 border-purple-100",
        labelKey: 'checked_out'
    },
    'CheckedOut': {
        style: "bg-purple-50 text-purple-600 border-purple-100",
        labelKey: 'checked_out'
    },
    [ReservationStatus.Cancelled]: {
        style: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: 'cancelled'
    },
    'Cancelled': {
        style: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: 'cancelled'
    },
    [ReservationStatus.NoShow]: {
        style: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: 'no_show'
    },
    'NoShow': {
        style: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: 'no_show'
    },
    "Pending": {
        style: "bg-amber-50 text-amber-600 border-amber-100",
        labelKey: 'pending'
    },
    "Parsed": {
        style: "bg-emerald-50 text-emerald-600 border-emerald-100",
        labelKey: 'parsed'
    },
    "Failed": {
        style: "bg-rose-50 text-rose-600 border-rose-100",
        labelKey: 'failed'
    }
};

interface StatusBadgeProps {
    status: ReservationStatus | string;
    className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
    const { t } = useTranslation();
    const config = STATUS_CONFIG[status.toString()] || {
        style: "bg-slate-50 text-slate-400 border-slate-100",
        labelKey: 'unknown'
    };

    return (
        <span className={cn(
            `inline-flex px-1.5 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-widest border h-fit whitespace-nowrap`,
            config.style,
            className
        )}>
            {t(config.labelKey)}
        </span>
    );
};
