import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuditDeletes } from '@/hooks/admin/useAuditDeletes';
import type { ReservationDeleteAuditListItemDto } from '@/api/admin';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, History, Eye, Trash2, XCircle, Building2, Calendar, User, Hash, AlertCircle, LayoutGrid, Settings2, Shield } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
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

    const stats = {
        total: audits?.length || 0,
        deletions: audits?.filter(a => a.eventType === 'Deleted').length || 0,
        cancellations: audits?.filter(a => a.eventType === 'Cancelled').length || 0,
        uniqueActors: new Set(audits?.map(a => a.actorEmail)).size || 0
    };

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* STICKY NAVY ACTION BAR */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <History className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('admin.audit_title', 'Forensic Audit Ledger')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${eventType === 'Deleted' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {t('admin.audit_subtitle', 'Protocol Compliance Tracking')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Tabs value={eventType} onValueChange={(v) => setEventType(v as any)} className="w-[240px]">
                                <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10 h-10 p-1 rounded-xl">
                                    <TabsTrigger value="Deleted" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-rose-600 data-[state=active]:text-white rounded-lg transition-all">
                                        Deletions
                                    </TabsTrigger>
                                    <TabsTrigger value="Cancelled" className="text-[9px] font-black uppercase tracking-widest data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all">
                                        Cancelled
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    {/* HIGH-DENSITY SEARCH BAR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <Input
                                placeholder={t('admin.search_audit_placeholder', 'Search Email or UUID...')}
                                className="bg-white/5 border-white/10 focus:border-blue-500/50 text-white font-bold h-11 ps-11 rounded-xl placeholder:text-slate-600 placeholder:font-black placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <Input
                                placeholder={t('admin.filter_hotel', 'Filter by Property Name...')}
                                className="bg-white/5 border-white/10 focus:border-blue-500/50 text-white font-bold h-11 ps-11 rounded-xl placeholder:text-slate-600 placeholder:font-black placeholder:text-[10px] placeholder:uppercase placeholder:tracking-widest"
                                value={hotelFilter}
                                onChange={(e) => setHotelFilter(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-1 sm:px-0">
                <MetricCard
                    title="Audit Volume"
                    value={stats.total}
                    icon={<Hash className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-100"
                    trend="Total Index"
                />
                <MetricCard
                    title="Purge Events"
                    value={stats.deletions}
                    icon={<Trash2 className="w-4 h-4 text-rose-600" />}
                    bg="bg-rose-100"
                    trend="Permanent"
                />
                <MetricCard
                    title="Cancellations"
                    value={stats.cancellations}
                    icon={<XCircle className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-100"
                    trend="Operational"
                />
                <MetricCard
                    title="Operator Auth"
                    value={stats.uniqueActors}
                    icon={<Shield className="w-4 h-4 text-slate-600" />}
                    bg="bg-slate-100"
                    trend="Identity Count"
                />
            </div>

            {/* AUDIT TIMELINE */}
            <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-slate-400" />
                        Historical Snapshots
                    </h2>
                </div>

                {isLoading ? (
                    <AuditDeletesSkeleton />
                ) : isError ? (
                    <div className="p-12 text-center bg-rose-50 rounded-xl border border-rose-100">
                        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                        <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">{t('admin.error_loading_audit', 'Infrastructure Error')}</h3>
                        <p className="text-xs text-rose-500 font-bold mt-1">Failed to synchronize audit stream.</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: AUDIT CARDS */}
                        <div className="grid grid-cols-1 gap-4 sm:hidden px-1">
                            {audits && audits.length > 0 ? (
                                audits.map((item) => (
                                    <div key={item.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm p-6 space-y-4 relative active:scale-[0.99] transition-all group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-3 rounded-2xl shadow-lg",
                                                    eventType === 'Deleted' ? "bg-rose-500 shadow-rose-500/20" : "bg-blue-500 shadow-blue-500/20"
                                                )}>
                                                    {eventType === 'Deleted' ? <Trash2 className="w-4 h-4 text-white" /> : <XCircle className="w-4 h-4 text-white" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-tighter truncate">{item.actorEmail}</h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#{item.reservationId}</span>
                                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(item.occurredAtUtc), 'HH:mm • MMM dd')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSelectedAudit(item)}
                                                className="h-10 w-10 rounded-xl hover:bg-slate-50 text-slate-400"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <Building2 className="w-3 h-3" />
                                                {item.hotelName || 'Global System'}
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 italic text-[10px] font-medium text-slate-600 line-clamp-2">
                                                {item.reason || 'No justification provided.'}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <History className="w-12 h-12 text-slate-200 mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zero Forensic Records</p>
                                </div>
                            )}
                        </div>

                        {/* DESKTOP: PREMIUM REGISTRY TABLE */}
                        <div className="hidden sm:block rounded-xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                        <TableHead className="px-8 py-5">Event Timeline</TableHead>
                                        <TableHead className="py-5">Target Node</TableHead>
                                        <TableHead className="py-5">Authorized Actor</TableHead>
                                        <TableHead className="py-5">Justification</TableHead>
                                        <TableHead className="py-5 pr-8 text-right">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {audits && audits.length > 0 ? (
                                        audits.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-slate-50/50 transition-all group">
                                                <TableCell className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center",
                                                            eventType === 'Deleted' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                                                        )}>
                                                            {eventType === 'Deleted' ? <Trash2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-900 uppercase tracking-tighter text-xs">
                                                                {format(new Date(item.occurredAtUtc), 'yyyy-MM-dd HH:mm')}
                                                            </div>
                                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">UID: {item.reservationId}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5 font-black text-slate-700 uppercase tracking-tighter text-[11px]">
                                                    {item.hotelName || '-'}
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400">
                                                            {item.actorEmail?.[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600">{item.actorEmail}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5 max-w-[240px] truncate italic text-[11px] text-slate-400 font-medium">
                                                    {item.reason || '—'}
                                                </TableCell>
                                                <TableCell className="py-5 pr-8 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedAudit(item)}
                                                        className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-none"
                                                    >
                                                        Review
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-48 text-center bg-slate-50/50">
                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                    <History className="w-10 h-10 mb-2" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Protocol Ledger Empty</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            <Dialog open={!!selectedAudit} onOpenChange={() => setSelectedAudit(null)}>
                <DialogContent className="sm:max-w-[650px] rounded-xl border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <History className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter leading-none">{t('admin.audit_details', 'Log Analysis')}</h2>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Deep Packet Inspection</p>
                            </div>
                        </div>
                    </div>

                    {selectedAudit && (
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <DetailBox icon={<Calendar className="w-3.5 h-3.5" />} label="Timestamp" value={format(new Date(selectedAudit.occurredAtUtc), 'yyyy-MM-dd HH:mm:ss')} />
                                <DetailBox icon={<User className="w-3.5 h-3.5" />} label="Operator" value={selectedAudit.actorEmail} />
                                <DetailBox icon={<Building2 className="w-3.5 h-3.5" />} label="Node" value={selectedAudit.hotelName || 'System'} />
                                <DetailBox icon={<Hash className="w-3.5 h-3.5" />} label="Asset ID" value={`#${selectedAudit.reservationId}`} />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operator Justification</Label>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-xs font-medium text-slate-600 leading-relaxed shadow-inner">
                                    {selectedAudit.reason || t('admin.no_reason_provided', 'Zero documentation provided for this protocol event.')}
                                </div>
                            </div>

                            {selectedAudit.snapshotJson && (
                                <div className="space-y-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                                        <Settings2 className="w-3.5 h-3.5" />
                                        {t('admin.snapshot_data', 'State Serialization')}
                                    </div>
                                    <pre className="p-6 bg-slate-900 text-blue-200/80 rounded-[24px] text-[10px] font-mono overflow-auto max-h-[350px] border border-white/5 shadow-2xl">
                                        {JSON.stringify(JSON.parse(selectedAudit.snapshotJson), null, 4)}
                                    </pre>
                                </div>
                            )}

                            <Button onClick={() => setSelectedAudit(null)} className="w-full h-12 rounded-2xl bg-slate-100 text-slate-900 hover:bg-slate-200 font-black text-[11px] uppercase tracking-widest shadow-none">
                                Close Analysis
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

const MetricCard = ({ title, value, icon, bg, trend }: { title: string, value: string | number, icon: React.ReactNode, bg: string, trend: string }) => (
    <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group rounded-xl overflow-hidden bg-white">
        <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <div className={cn("p-1.5 rounded-xl transition-all shadow-sm", bg)}>{icon}</div>
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-none tracking-tighter truncate">{value}</h3>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{trend}</span>
        </CardContent>
    </Card>
);

const DetailBox = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {icon}
            {label}
        </div>
        <div className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tighter">{value}</div>
    </div>
);

const AuditDeletesSkeleton = () => (
    <div className="space-y-4 px-1 sm:px-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl bg-slate-50" />)}
        </div>
        <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl bg-slate-50" />
            ))}
        </div>
    </div>
);

export default AuditDeletes;
