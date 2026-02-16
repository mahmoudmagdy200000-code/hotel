import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuditDeletes } from '@/hooks/admin/useAuditDeletes';
import type { ReservationDeleteAuditListItemDto } from '@/api/admin';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, History, Eye, Info, Trash2, XCircle, Building2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

const AuditDeletes = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [hotelFilter, setHotelFilter] = useState('');
    const [eventType, setEventType] = useState<'Deleted' | 'Cancelled'>('Deleted');
    const [selectedAudit, setSelectedAudit] = useState<ReservationDeleteAuditListItemDto | null>(null);

    const { data: audits, isLoading, isError } = useAuditDeletes({
        query: searchQuery,
        hotelName: hotelFilter,
        eventType,
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-6 h-6" />
                        {t('admin.audit_title', 'Reservations Audit Log')}
                    </h1>
                    <p className="text-slate-500">
                        {t('admin.audit_subtitle', 'Track and review cancelled or deleted reservations and their historical snapshots.')}
                    </p>
                </div>
            </div>

            <Card className="border-none shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-grow max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder={t('admin.search_audit_placeholder', 'Search by email or Res ID...')}
                                className="pl-10 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="relative flex-grow max-w-[200px]">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder={t('admin.filter_hotel', 'Hotel Name...')}
                                className="pl-10 h-10"
                                value={hotelFilter}
                                onChange={(e) => setHotelFilter(e.target.value)}
                            />
                        </div>

                        <Tabs value={eventType} onValueChange={(v) => setEventType(v as any)} className="w-[300px]">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="Deleted" className="flex items-center gap-2">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    {t('admin.tab_deleted', 'Deletions')}
                                </TabsTrigger>
                                <TabsTrigger value="Cancelled" className="flex items-center gap-2">
                                    <XCircle className="w-3.5 h-3.5" />
                                    {t('admin.tab_cancelled', 'Cancellations')}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <AuditDeletesSkeleton />
                    ) : isError ? (
                        <div className="p-8 text-center text-red-500">
                            {t('admin.error_loading_audit', 'Failed to load audit logs.')}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('admin.occurred_at', 'Date/Time')}</TableHead>
                                        <TableHead>{t('admin.reservation_id', 'Res ID')}</TableHead>
                                        <TableHead>{t('admin.hotel', 'Hotel')}</TableHead>
                                        <TableHead>{eventType === 'Deleted' ? t('admin.deleted_by', 'Deleted By') : t('admin.cancelled_by', 'Cancelled By')}</TableHead>
                                        <TableHead>{t('admin.reason', 'Reason')}</TableHead>
                                        <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {audits && audits.length > 0 ? (
                                        audits.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-slate-50/50">
                                                <TableCell className="font-medium">
                                                    {format(new Date(item.occurredAtUtc), 'yyyy-MM-dd HH:mm')}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">#{item.reservationId}</span>
                                                </TableCell>
                                                <TableCell className="font-medium text-slate-700">
                                                    {item.hotelName || '-'}
                                                </TableCell>
                                                <TableCell>{item.actorEmail}</TableCell>
                                                <TableCell className="max-w-[200px] truncate text-slate-500 italic">
                                                    {item.reason || '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedAudit(item)}
                                                        className="h-8 group"
                                                    >
                                                        <Eye className="w-4 h-4 me-2 text-slate-400 group-hover:text-blue-500" />
                                                        {t('common.view', 'View')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <History className="w-8 h-8 text-slate-200" />
                                                    {eventType === 'Deleted'
                                                        ? t('admin.no_deleted_found', 'No deletion logs found.')
                                                        : t('admin.no_cancelled_found', 'No cancellation logs found.')}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{t('admin.audit_details', 'Audit Log Details')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.audit_details_description', 'Historical snapshot of the reservation at the time of deletion.')}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAudit && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-slate-400">{t('admin.occurred_at', 'Date/Time')}</div>
                                    <div className="font-semibold">{format(new Date(selectedAudit.occurredAtUtc), 'yyyy-MM-dd HH:mm:ss')}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400">{selectedAudit.eventType === 'Deleted' ? t('admin.deleted_by', 'Deleted By') : t('admin.cancelled_by', 'Cancelled By')}</div>
                                    <div className="font-semibold">{selectedAudit.actorEmail}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-slate-400">{t('admin.hotel', 'Hotel')}</div>
                                    <div className="font-semibold">{selectedAudit.hotelName || '-'}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-slate-400">{t('admin.reason', 'Reason')}</div>
                                    <div className="p-3 bg-slate-50 rounded-lg border italic">
                                        {selectedAudit.reason || t('admin.no_reason_provided', 'No reason provided.')}
                                    </div>
                                </div>
                            </div>

                            {selectedAudit.snapshotJson && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium flex items-center gap-2">
                                        <Info className="w-4 h-4" />
                                        {t('admin.snapshot_data', 'Snapshot Data')}
                                    </div>
                                    <pre className="p-4 bg-slate-900 text-slate-300 rounded-lg text-xs overflow-auto max-h-[300px]">
                                        {JSON.stringify(JSON.parse(selectedAudit.snapshotJson), null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const AuditDeletesSkeleton = () => (
    <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
    </div>
);

export default AuditDeletes;
