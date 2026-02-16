import { useState } from 'react';
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReservationsList } from '@/hooks/reservations/useReservationsList';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search,
    Filter,
    ChevronRight,
    Plus,
    AlertCircle
} from 'lucide-react';
import { ReservationStatus } from '@/api/types/reservations';
import { formatCurrency } from '@/lib/utils';

const STATUS_VARIANTS: Record<ReservationStatus, "default" | "secondary" | "destructive" | "outline"> = {
    [ReservationStatus.Draft]: "outline",
    [ReservationStatus.Confirmed]: "default",
    [ReservationStatus.CheckedIn]: "secondary",
    [ReservationStatus.CheckedOut]: "outline",
    [ReservationStatus.Cancelled]: "destructive",
    [ReservationStatus.NoShow]: "destructive",
};

const ReservationsList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Filters
    const [status, setStatus] = useState<ReservationStatus | 'all'>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const fromDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
    const toDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

    const { data: reservations, isLoading, isError, error } = useReservationsList({
        status: status === 'all' ? undefined : status,
        from: fromDate || undefined,
        to: toDate || undefined,
        searchTerm: searchTerm || undefined,
        includeLines: true
    });

    const getStatusLabel = (status: ReservationStatus) => {
        switch (status) {
            case ReservationStatus.Draft: return t('status.draft', 'Draft');
            case ReservationStatus.Confirmed: return t('status.confirmed', 'Confirmed');
            case ReservationStatus.CheckedIn: return t('status.checked_in', 'Checked In');
            case ReservationStatus.CheckedOut: return t('status.checked_out', 'Checked Out');
            case ReservationStatus.Cancelled: return t('status.cancelled', 'Cancelled');
            case ReservationStatus.NoShow: return t('status.no_show', 'No Show');
            default: return status;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {t('reservations.title', 'Reservations')}
                </h1>
                <Button onClick={() => navigate('/reservations/new')} className="bg-slate-900">
                    <Plus className="w-4 h-4 me-2" />
                    {t('reservations.new', 'New Reservation')}
                </Button>
            </div>

            {/* Filters Bar */}
            <Card className="border-none shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                                value={status}
                                onChange={(e) => setStatus(e.target.value === 'all' ? 'all' : Number(e.target.value) as ReservationStatus)}
                            >
                                <option value="all">{t('common.all_statuses', 'All Statuses')}</option>
                                <option value={ReservationStatus.Draft}>{t('status.draft', 'Draft')}</option>
                                <option value={ReservationStatus.Confirmed}>{t('status.confirmed', 'Confirmed')}</option>
                                <option value={ReservationStatus.CheckedIn}>{t('status.checked_in', 'Checked In')}</option>
                                <option value={ReservationStatus.CheckedOut}>{t('status.checked_out', 'Checked Out')}</option>
                                <option value={ReservationStatus.Cancelled}>{t('status.cancelled', 'Cancelled')}</option>
                                <option value={ReservationStatus.NoShow}>{t('status.no_show', 'No Show')}</option>
                            </select>
                        </div>

                        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-[240px]"
                        />

                        <div className="flex-grow" />

                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder={t('common.search_placeholder', 'Search guest or booking...')}
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Reservations Table */}
            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>{t('reservations.guest', 'Guest')}</TableHead>
                            <TableHead>{t('reservations.check_in', 'Check In')}</TableHead>
                            <TableHead>{t('reservations.check_out', 'Check Out')}</TableHead>
                            <TableHead>{t('reservations.total', 'Total')}</TableHead>
                            <TableHead>{t('reservations.status', 'Status')}</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : isError ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-red-500">
                                    {error instanceof Error ? error.message : t('common.error_loading', 'Error loading reservations')}
                                </TableCell>
                            </TableRow>
                        ) : reservations?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                    {t('reservations.no_results', 'No reservations found.')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            reservations?.map((res) => (
                                <TableRow
                                    key={res.id}
                                    className={`cursor-pointer group ${res.totalAmount === 0 ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-4 border-l-amber-500' : 'hover:bg-slate-50'}`}
                                    onClick={() => navigate(`/reservations/${res.id}`)}
                                >
                                    <TableCell>
                                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                                            {res.guestName}
                                            {res.totalAmount === 0 && (
                                                <span title={t('reservations.missing_price', 'Missing Price')}>
                                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">{res.phone || t('common.no_phone', 'No phone')}</div>
                                    </TableCell>
                                    <TableCell className="text-sm">{res.checkInDate}</TableCell>
                                    <TableCell className="text-sm">{res.checkOutDate}</TableCell>
                                    <TableCell>
                                        <div className={`font-medium ${res.totalAmount === 0 ? 'text-red-500 font-bold' : ''}`}>
                                            {res.totalAmount === 0 ? t('reservations.no_price', 'Price not set') : formatCurrency(res.totalAmount, res.currency)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_VARIANTS[res.status]} className="capitalize">
                                            {getStatusLabel(res.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default ReservationsList;
