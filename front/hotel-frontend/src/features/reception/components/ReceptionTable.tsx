
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from 'lucide-react';
import type { ReceptionReservationItemDto } from '@/api/types/reception';

interface ReceptionTableProps {
    data: ReceptionReservationItemDto[];
    emptyMessage: string;
    onAction: (type: 'check-in' | 'check-out' | 'cancel' | 'confirm' | 'no-show', reservation: ReceptionReservationItemDto) => void;
}

const StatusBadge = ({ status }: { status: string }) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

    switch (status.toLowerCase()) {
        case 'confirmed':
        case 'draft':
            variant = 'default';
            break;
        case 'checkedin':
            variant = 'secondary';
            break;
        case 'checkedout':
            variant = 'outline';
            break;
        case 'cancelled':
        case 'noshow':
            variant = 'destructive';
            break;
        default:
            variant = 'outline';
            break;
    }

    return (
        <Badge variant={variant} className="capitalize">
            {status}
        </Badge>
    );
};

const ReceptionTable = ({ data, emptyMessage, onAction }: ReceptionTableProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();

    if (data.length === 0) {
        return (
            <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('reception.booking_number', 'Booking #')}</TableHead>
                        <TableHead>{t('reception.guest_name', 'Guest')}</TableHead>
                        <TableHead>{t('reception.phone', 'Phone')}</TableHead>
                        <TableHead>{t('reception.checkin', 'Check In')}</TableHead>
                        <TableHead>{t('reception.checkout', 'Check Out')}</TableHead>
                        <TableHead>{t('reception.status', 'Status')}</TableHead>
                        <TableHead>{t('reception.rooms', 'Rooms')}</TableHead>
                        <TableHead>{t('reception.room_types', 'Type')}</TableHead>
                        <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.reservationId}>
                            <TableCell className="font-medium text-xs">{item.bookingNumber}</TableCell>
                            <TableCell className="font-semibold">{item.guestName}</TableCell>
                            <TableCell className="text-xs text-slate-500">{item.phone || '—'}</TableCell>
                            <TableCell className="text-xs">{item.checkIn}</TableCell>
                            <TableCell className="text-xs">{item.checkOut}</TableCell>
                            <TableCell>
                                <StatusBadge status={item.status} />
                            </TableCell>
                            <TableCell className="text-xs">{item.roomNumbers && item.roomNumbers.length > 0 ? item.roomNumbers.join(', ') : '—'}</TableCell>
                            <TableCell className="text-xs truncate max-w-[150px]" title={item.roomTypeNames?.join(', ')}>
                                {item.roomTypeNames && item.roomTypeNames.length > 0 ? item.roomTypeNames.join(', ') : '—'}
                            </TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate(`/reception/reservations/${item.reservationId}`)}
                                    title={t('common.view', 'View')}
                                >
                                    <Eye className="w-4 h-4" />
                                </Button>

                                {(item.status === 'Confirmed' || item.status === 'Draft') && (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => onAction('check-in', item)}
                                        >
                                            {t('reception.check_in', 'Check-in')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                            onClick={() => onAction('no-show', item)}
                                        >
                                            {t('reception.no_show', 'No-show')}
                                        </Button>
                                    </div>
                                )}

                                {item.status === 'CheckedIn' && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => onAction('check-out', item)}
                                    >
                                        {t('reception.check_out', 'Check-out')}
                                    </Button>
                                )}

                                {(item.status === 'Draft' || item.status === 'Pending') && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => onAction('confirm', item)}
                                        >
                                            {t('reception.confirm', 'Confirm')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => onAction('cancel', item)}
                                            disabled={user?.role === 'Receptionist'}
                                            title={user?.role === 'Receptionist' ? t('reception.cancel_restricted', 'Cancel restricted for receptionists') : t('reception.cancel', 'Cancel')}
                                        >
                                            {t('reception.cancel', 'Cancel')}
                                        </Button>
                                    </>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default ReceptionTable;
