import { useTranslation } from 'react-i18next';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
} from "@/components/ui/table";
import { AlertCircle } from 'lucide-react';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import { UnifiedBookingCard } from '@/components/reservation/UnifiedBookingCard';
import { UnifiedBookingRow } from '@/components/reservation/UnifiedBookingRow';
import { mapReceptionDto } from '@/api/adapters/bookingAdapter';

/**
 * Ras Sedr Rental - Reception Operation Table
 * Universal component for tracking guest flow with high-impact mobile cards and premium desktop views.
 */

interface ReceptionTableProps {
    data: ReceptionReservationItemDto[];
    emptyMessage: string;
    onAction: (type: 'check-in' | 'check-out' | 'cancel' | 'confirm' | 'no-show', reservation: ReceptionReservationItemDto) => void;
}

const ReceptionTable = ({ data, emptyMessage, onAction }: ReceptionTableProps) => {
    const { t } = useTranslation();

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                <div className="p-8 bg-white rounded-full shadow-inner opacity-60">
                    <AlertCircle className="w-12 h-12 text-slate-200" />
                </div>
                <div className="space-y-1 text-center mt-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{emptyMessage}</h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter opacity-60">{t('reception.no_operations', 'No operations pending for this category.')}</p>
                </div>
            </div>
        );
    }

    const handleAction = (type: string, booking: any) => {
        const originalItem = data.find(item => item.reservationId === booking.id);
        if (originalItem) {
            onAction(type as any, originalItem);
        }
    };

    return (
        <div className="space-y-4">
            {/* MOBILE: HIGH-DENSITY COMPACT LIST */}
            <div className="grid grid-cols-1 md:hidden pb-4 divide-y divide-slate-100 bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                {data.map((item) => (
                    <UnifiedBookingCard
                        key={item.reservationId}
                        booking={mapReceptionDto(item)}
                        onAction={handleAction}
                        detailPath={`/reception/reservations/${item.reservationId}`}
                    />
                ))}
            </div>

            {/* DESKTOP: PREMIUM OPERATIONAL TABLE */}
            <div className="hidden sm:block rounded-[32px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-widest border-b border-slate-100 text-[10px]">
                            <TableHead className="py-5 px-8">{t('reception.guest_name')}</TableHead>
                            <TableHead className="py-5 px-4">{t('reception.booking_number')}</TableHead>
                            <TableHead className="py-5 px-4">{t('reception.temporal_range', 'Temporal Range')}</TableHead>
                            <TableHead className="py-5 px-4">{t('reception.rooms')}</TableHead>
                            <TableHead className="py-5 px-8 text-right">{t('actions')}</TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <UnifiedBookingRow
                                key={item.reservationId}
                                booking={mapReceptionDto(item)}
                                onAction={handleAction}
                                detailPath={`/reception/reservations/${item.reservationId}`}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};


export default ReceptionTable;
