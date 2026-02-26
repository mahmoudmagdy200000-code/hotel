import { useState, useEffect } from 'react';
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useTranslation } from 'react-i18next';
import { usePendingRequests } from '@/features/reception/hooks/usePendingRequests';
import { useParsePendingRequest } from '@/features/reception/hooks/useParsePendingRequest';
import { useConfirmPendingRequest } from '@/features/reception/hooks/useConfirmPendingRequest';
import { useDeletePendingRequest } from '@/features/reception/hooks/useDeletePendingRequest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useUploadPdfReservationsBatch } from '@/features/reception/hooks/useUploadPdfReservationsBatch';
import { useParsePdfReservationsBatch } from '@/features/reception/hooks/useParsePdfReservationsBatch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useAdminListings } from '@/hooks/admin/useAdminListings';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, CheckCircle2, XCircle, Clock, FileSearch, CalendarRange, AlertTriangle, Upload, Loader2, Trash2, Eye, CheckCheck, Hash, Hotel } from 'lucide-react';
import { cn, formatCurrency, extractErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PdfViewer } from '@/components/attachments/PdfViewer';
import { AllocationReviewModal } from './components/AllocationReviewModal';
import { useGetConfirmationPlan, useApplyConfirmationPlan } from '@/features/reception/hooks/useBulkConfirmation';
import type { ReservationAllocationPlanDto } from '@/api/types/reception';

const PendingRequests = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Initial range: today to +7 days
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: today,
        to: nextWeek,
    });

    const [debouncedRange, setDebouncedRange] = useState(dateRange);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedRange(dateRange);
        }, 300);
        return () => clearTimeout(handler);
    }, [dateRange]);

    const fromDate = debouncedRange?.from ? format(debouncedRange.from, 'yyyy-MM-dd') : '';
    const toDate = debouncedRange?.to ? format(debouncedRange.to, 'yyyy-MM-dd') : '';

    // Validation for UI feedback and query safety
    const dateDiff = fromDate && toDate ? (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 3600 * 24) : 0;
    const isRangeTooLarge = dateDiff > 90;
    const isRangeInvalid = fromDate && toDate && new Date(toDate) <= new Date(fromDate);

    const { data, isLoading, isError, error, refetch } = usePendingRequests(
        fromDate,
        toDate,
        50,
        !isRangeTooLarge && !isRangeInvalid && !!fromDate && !!toDate
    );

    // Mutations
    const parse = useParsePendingRequest();
    const batchParse = useParsePdfReservationsBatch();
    const confirm = useConfirmPendingRequest();
    const deletePending = useDeletePendingRequest();
    const uploadBatch = useUploadPdfReservationsBatch();

    // Listings
    const { data: listings } = useAdminListings(false); // active only
    const [selectedListingId, setSelectedListingId] = useState<string>('');

    // Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Confirmation Dialog State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
        variant?: 'default' | 'destructive';
    }>({
        isOpen: false,
        title: '',
        description: '',
        onConfirm: () => { },
    });

    const [viewingPdfId, setViewingPdfId] = useState<{ id: number; number: string } | null>(null);

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    // Confirm All / Plan Flow
    const getPlan = useGetConfirmationPlan();
    const applyPlan = useApplyConfirmationPlan();
    const [allocationPlan, setAllocationPlan] = useState<ReservationAllocationPlanDto | null>(null);
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        if (!selectedListingId) {
            toast.error(t('reception.listing_required'));
            event.target.value = '';
            return;
        }

        try {
            const results = await uploadBatch.mutateAsync({ files, listingId: selectedListingId });

            if (results.failedCount === 0) {
                toast.success(t('reception.batch_upload_success', 'Successfully uploaded {{count}} PDF(s).', { count: results.successCount }));
            } else {
                toast.warning(t('reception.batch_upload_partial', 'Uploaded {{success}} successfully. {{failed}} failed.', {
                    success: results.successCount,
                    failed: results.failedCount
                }));
                // List failures
                results.items.filter(i => i.status === 'Failed').forEach(i => {
                    toast.error(`${i.fileName}: ${i.errorMessage || i.errorCode}`);
                });
            }

            // Reset input
            event.target.value = '';
        } catch (err: unknown) {
            toast.error(extractErrorMessage(err));
        }
    };

    const handleParse = async (id: number, number: string) => {
        try {
            await parse.mutateAsync(id);
            toast.success(t('reception.parse_success', 'Parsing triggered successfully.'));
        } catch (err: unknown) {
            const axiosErr = err as import('axios').AxiosError<{ detail?: string; correlationId?: string; errorCode?: string; failureStep?: string }>;
            const errorData = axiosErr.response?.data;
            const correlationId = errorData?.correlationId || 'N/A';
            const errorCode = errorData?.errorCode || 'UNKNOWN';
            const failureStep = errorData?.failureStep || 'Unknown';

            // Clean log for expected failure status
            if (axiosErr.response?.status === 422) {
                console.warn(`Parsing failed for request ${number} (ID: ${id}): ${errorData?.detail || 'Handled error'}`);
            } else {
                console.error(`Unexpected parsing failure for request ${number}:`, err);
            }

            let detailedMsg = `Parsing failed: ${errorData?.detail || (err as Error).message}\n`;
            detailedMsg += `Step: ${failureStep} | Code: ${errorCode} | ID: ${correlationId}`;

            toast.error(detailedMsg);
        }
    };



    const handleTriggerReview = (ids: number[]) => {
        getPlan.mutate(ids, {
            onSuccess: (plan) => {
                setAllocationPlan(plan);
                setIsReviewOpen(true);
            },
            onError: (err) => {
                toast.error(extractErrorMessage(err));
            }
        });
    };

    const handleCancel = async (id: number, number: string) => {
        setConfirmState({
            isOpen: true,
            title: t('reception.cancel_draft_title', 'Delete Draft Request'),
            description: `${t('reception.cancel_prompt', 'Are you sure you want to permanently delete this draft request')} ${number}?`,
            variant: 'destructive',
            onConfirm: async () => {
                closeConfirm();
                try {
                    // Use dedicated pending delete endpoint (DELETE /api/pdf-reservations/{id})
                    // This will return 409 Conflict if reservation is already confirmed
                    await deletePending.mutateAsync({ id });
                    toast.success(t('reception.delete_success', 'Draft request deleted successfully.'));
                    refetch();
                } catch (err: unknown) {
                    toast.error(extractErrorMessage(err));
                }
            }
        });
    };

    const handleBatchParse = async (ids?: number[]) => {
        const targetIds = ids || selectedIds;
        if (targetIds.length === 0) return;

        try {
            const result = await batchParse.mutateAsync(targetIds);

            if (result.failedCount === 0) {
                toast.success(t('reception.batch_parse_success', 'Successfully parsed {{count}} reservation(s).', { count: result.successCount }));
            } else {
                toast.warning(t('reception.batch_parse_partial', 'Parsed {{success}} successfully. {{failed}} failed.', {
                    success: result.successCount,
                    failed: result.failedCount
                }));
            }

            if (!ids) setSelectedIds([]); // Clear selection if parsing selected
            refetch();
        } catch (err: unknown) {
            toast.error(extractErrorMessage(err));
        }
    };

    const handleParseAllPending = () => {
        if (!data?.items) return;
        const pendingIds = data.items
            .filter(item => item.parsingStatus === 'Pending' || item.parsingStatus === 'Failed')
            .map(item => item.reservationId);

        if (pendingIds.length === 0) {
            toast.info(t('reception.no_pending_to_parse', 'No pending or failed items to parse.'));
            return;
        }

        handleBatchParse(pendingIds);
    };

    const toggleSelection = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (!data?.items) return;
        if (selectedIds.length === data.items.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(data.items.map(item => item.reservationId));
        }
    };

    const handleConfirmAll = () => {
        if (!data?.items) return;

        // If selection exists, use selection. Otherwise use all parsed items.
        const targetIds = selectedIds.length > 0
            ? selectedIds
            : data.items.filter(item => item.parsingStatus === 'Parsed').map(item => item.reservationId);

        if (targetIds.length === 0) {
            toast.info(t('reception.no_parsed_confirm', 'No parsed reservations found to confirm.'));
            return;
        }

        handleTriggerReview(targetIds);
    };

    const getHintBadge = (bucket?: string) => {
        if (!bucket) return null;

        switch (bucket) {
            case 'Safe':
                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">{t('reception.safe', 'Safe')}</Badge>;
            case 'Tight':
                return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">{t('reception.tight', 'Tight')}</Badge>;
            case 'Overbook':
                return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">{t('reception.overbook', 'Overbook')}</Badge>;
            default:
                return <Badge variant="outline">{bucket}</Badge>;
        }
    };

    const getParsingStatusIcon = (status: string, errorCode?: string | null) => {
        switch (status) {
            case 'Parsed':
                return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'Failed':
                return (
                    <span title={errorCode ?? undefined}>
                        <XCircle className="w-4 h-4 text-red-500" />
                    </span>
                );
            case 'Pending':
            default:
                return <Clock className="w-4 h-4 text-amber-500 animate-pulse" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header: Core Navigation & Actions */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-row items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                            {t('reception.pending_requests', 'Pending Requests')}
                        </h1>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                            {dateRange?.from?.toLocaleDateString() === today.toLocaleDateString() ? t('today', 'Today') : format(dateRange?.from || today, 'MMM d')}
                            <span>→</span>
                            {format(dateRange?.to || nextWeek, 'MMM d, yyyy')}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="hidden md:block w-auto"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-slate-100 transition-transform active:scale-95 flex-shrink-0"
                            onClick={() => refetch()}
                            disabled={isLoading}
                        >
                            <RefreshCw className={cn("h-4 w-4 text-slate-400", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Main Action Bar: Compact & Responsive */}
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white shadow-sm flex-1 sm:w-48 text-xs font-bold">
                                <SelectValue placeholder={t('reception.select_listing')} />
                            </SelectTrigger>
                            <SelectContent>
                                {listings?.map(listing => (
                                    <SelectItem key={listing.id} value={listing.id}>
                                        {listing.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="default"
                            className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                            onClick={() => {
                                if (!selectedListingId) {
                                    toast.error(t('reception.listing_required'));
                                } else {
                                    document.getElementById('pdf-upload')?.click();
                                }
                            }}
                            disabled={uploadBatch.isPending || !selectedListingId}
                        >
                            <Upload className={cn("w-3.5 h-3.5 me-2", uploadBatch.isPending && "animate-bounce")} />
                            {uploadBatch.isPending ? t('uploading') : t('reception.upload_pdfs')}
                        </Button>
                    </div>

                    <div className="h-px w-full sm:h-6 sm:w-px bg-slate-200 sm:mx-1" />

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant="outline"
                            className="h-10 px-4 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-black uppercase tracking-widest flex-1 sm:flex-none"
                            onClick={handleParseAllPending}
                            disabled={batchParse.isPending || !data?.items.some(i => i.parsingStatus === 'Pending' || i.parsingStatus === 'Failed')}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5 me-2", batchParse.isPending && "animate-spin")} />
                            {t('reception.parse_all')}
                        </Button>
                        <Button
                            variant="outline"
                            className="h-10 px-4 rounded-xl border-emerald-100 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 text-xs font-black uppercase tracking-widest flex-1 sm:flex-none"
                            onClick={handleConfirmAll}
                            disabled={isLoading || getPlan.isPending || !data?.items.some(i => i.parsingStatus === 'Parsed')}
                        >
                            {getPlan.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5 me-2" />}
                            {t('reception.confirm_all_parsed')}
                        </Button>
                    </div>

                    <input id="pdf-upload" type="file" accept=".pdf" multiple className="hidden" onChange={handleFileUpload} />
                </div>
            </div>

            {(isError || isRangeTooLarge || isRangeInvalid) && (
                <div className="bg-white border-l-4 border-amber-500 rounded-xl p-6 shadow-sm flex items-start gap-5 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className={cn(
                        "p-3 rounded-2xl",
                        isRangeTooLarge || isRangeInvalid ? "bg-amber-50/50" : "bg-red-50"
                    )}>
                        {isRangeTooLarge ? (
                            <CalendarRange className="w-6 h-6 text-amber-600" />
                        ) : isRangeInvalid ? (
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        ) : (
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        )}
                    </div>
                    <div className="space-y-1.5 flex-1">
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                            {isRangeTooLarge ? t('reception.limit_exceeded', 'Operational Limit Exceeded') :
                                isRangeInvalid ? t('reception.invalid_dates', 'Invalid Date Sequence') :
                                    t('service_error', 'System Connection Error')}
                        </h3>
                        <p className="text-slate-600 leading-relaxed max-w-2xl text-sm">
                            {isRangeTooLarge ? (
                                t('reception.range_too_large_professional', 'To ensure optimal system performance, query windows are restricted to a 90-day period. Please refine your selection to continue.')
                            ) : isRangeInvalid ? (
                                t('reception.range_invalid', 'The departure date must be set after the arrival date. Please adjust your calendar selection.')
                            ) : (
                                (error as import('axios').AxiosError<{ detail?: string }>)?.response?.data?.detail || t('reception.failed_to_load_pending', 'We encountered a problem synchronizing with the server. Please check your connection and retry.')
                            )}
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            {isRangeTooLarge && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="bg-slate-100 text-slate-900 hover:bg-slate-200"
                                    onClick={() => {
                                        const d = new Date(fromDate);
                                        const newTo = new Date(d);
                                        newTo.setDate(d.getDate() + 90);
                                        setDateRange({ from: d, to: newTo });
                                    }}
                                >
                                    <CalendarRange className="w-4 h-4 me-2" />
                                    {t('reception.auto_fix_range', 'Snap to 90 Days')}
                                </Button>
                            )}
                            {!isRangeTooLarge && !isRangeInvalid && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="bg-slate-100 text-slate-900 hover:bg-slate-200"
                                    onClick={() => refetch()}
                                >
                                    <RefreshCw className="w-4 h-4 me-2" />
                                    {t('reconnect', 'Reconnect Now')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Totals Summary: 2x2 Compact Mobile Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
                ) : data && (
                    <>
                        <Card className="border border-slate-100 shadow-sm group bg-slate-50/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                <CardTitle className="text-[9px] uppercase font-black text-slate-400 tracking-wider">
                                    {t('total')}
                                </CardTitle>
                                <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                                    <Clock className="h-3 w-3" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-xl font-black text-slate-900 leading-none tracking-tight">
                                    {data.totals.count}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-100 shadow-sm group bg-emerald-50/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                <CardTitle className="text-[9px] uppercase font-black text-emerald-600 tracking-wider">
                                    {t('reception.safe')}
                                </CardTitle>
                                <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                                    <CheckCheck className="h-3 w-3" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-xl font-black text-slate-900 leading-none tracking-tight">
                                    {data.totals.safeCount}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-100 shadow-sm group bg-amber-50/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                <CardTitle className="text-[9px] uppercase font-black text-amber-600 tracking-wider">
                                    {t('reception.tight')}
                                </CardTitle>
                                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600">
                                    <AlertTriangle className="h-3 w-3" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-xl font-black text-slate-900 leading-none tracking-tight">
                                    {data.totals.tightCount}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-100 shadow-sm group bg-rose-50/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                <CardTitle className="text-[9px] uppercase font-black text-rose-600 tracking-wider">
                                    {t('reception.overbook')}
                                </CardTitle>
                                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600">
                                    <XCircle className="h-3 w-3" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-xl font-black text-slate-900 leading-none tracking-tight">
                                    {data.totals.overbookCount}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Request List: Mobile-First Cards & Premium Desktop Table */}
            <div className="space-y-4">
                {/* Mobile: List Cards */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                    {data?.items.map((item) => {
                        const isParsingThis = parse.isPending && parse.variables === item.reservationId;
                        const isConfirmingThis = confirm.isPending && confirm.variables === item.reservationId;
                        const isDeletingThis = deletePending.isPending && deletePending.variables?.id === item.reservationId;
                        const isProcessing = isParsingThis || isConfirmingThis || isDeletingThis;
                        const hasExtractedData = item.parsingStatus === 'Parsed' ||
                            (item.parsingStatus === 'Failed' && item.guestName && item.guestName !== 'PDF Guest');

                        return (
                            <div
                                key={item.reservationId}
                                className={cn(
                                    "bg-white border-l-4 rounded-xl p-4 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden",
                                    item.availabilityHint?.bucket === 'Safe' ? "border-l-emerald-500" :
                                        item.availabilityHint?.bucket === 'Tight' ? "border-l-amber-500" :
                                            item.availabilityHint?.bucket === 'Overbook' ? "border-l-rose-500" : "border-l-slate-200",
                                    isProcessing && "opacity-60 pointer-events-none"
                                )}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={selectedIds.includes(item.reservationId)}
                                                onChange={() => toggleSelection(item.reservationId)}
                                                className="rounded-lg h-5 w-5 border-slate-200"
                                            />
                                            <h3 className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                                                {item.guestName && item.guestName !== 'PDF Guest' ? item.guestName : t('pending_extraction')}
                                            </h3>
                                            <div className="flex items-center gap-1">
                                                {getParsingStatusIcon(item.parsingStatus)}
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center justify-between group/info">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                                                    <Hash className="w-3 h-3" />
                                                    <span>{item.bookingNumber}</span>
                                                </div>
                                                <div className="text-[10px] font-black text-slate-900">
                                                    {item.checkIn} → {item.checkOut}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5">
                                                    <Hotel className="w-3 h-3" />
                                                    {item.hotelName || t('unknown_hotel')}
                                                </div>
                                                {hasExtractedData && (item.totalAmount ?? 0) > 0 && (
                                                    <div className="text-xs font-black text-blue-600">
                                                        {formatCurrency(item.totalAmount ?? 0, item.currency || 'USD')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Actions (Mobile) */}
                                    <div className="flex flex-col gap-2">
                                        {item.parsingStatus === 'Parsed' ? (
                                            <Button
                                                size="icon"
                                                className="h-10 w-10 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-100"
                                                onClick={() => handleTriggerReview([item.reservationId])}
                                                disabled={getPlan.isPending && getPlan.variables?.includes(item.reservationId)}
                                            >
                                                {getPlan.isPending && getPlan.variables?.includes(item.reservationId) ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <CheckCheck className="w-5 h-5" />
                                                )}
                                            </Button>
                                        ) : (
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="h-10 w-10 border-slate-200 rounded-xl"
                                                onClick={() => handleParse(item.reservationId, item.bookingNumber)}
                                            >
                                                {isParsingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
                                            </Button>
                                        )}
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-10 w-10 text-slate-300 hover:text-blue-500"
                                            onClick={() => setViewingPdfId({ id: item.reservationId, number: item.bookingNumber })}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                {isParsingThis && (
                                    <div className="absolute bottom-0 left-0 h-1 bg-amber-400 animate-[loading_1s_infinite]" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Desktop: Premium Table */}
                <div className="hidden md:block rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white">
                    <Table>
                        <TableHeader>
                            <tr className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-tighter border-b border-slate-100">
                                <TableHead className="w-10 px-6">
                                    <Checkbox
                                        checked={data?.items.length ? selectedIds.length === data.items.length : false}
                                        onChange={() => toggleSelectAll()}
                                    />
                                </TableHead>
                                <TableHead className="py-4">{t('reception.status')}</TableHead>
                                <TableHead className="py-4">{t('reception.guest_info')}</TableHead>
                                <TableHead className="py-4">{t('reception.dates')}</TableHead>
                                <TableHead className="py-4 text-center">{t('reception.rooms')}</TableHead>
                                <TableHead className="py-4 text-right">{t('total')}</TableHead>
                                <TableHead className="py-4">{t('reception.availability')}</TableHead>
                                <TableHead className="py-4 px-6 text-right">{t('actions')}</TableHead>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {data?.items.map((item) => {
                                const isParsingThis = parse.isPending && parse.variables === item.reservationId;
                                const isConfirmingThis = confirm.isPending && confirm.variables === item.reservationId;
                                const isDeletingThis = deletePending.isPending && deletePending.variables?.id === item.reservationId;
                                const isProcessing = isParsingThis || isConfirmingThis || isDeletingThis;
                                const hasExtractedData = item.parsingStatus === 'Parsed' ||
                                    (item.parsingStatus === 'Failed' && item.guestName && item.guestName !== 'PDF Guest');

                                return (
                                    <TableRow key={item.reservationId} className={cn("hover:bg-blue-50/30 transition-all group", isProcessing && "opacity-50")}>
                                        <TableCell className="px-6">
                                            <Checkbox
                                                checked={selectedIds.includes(item.reservationId)}
                                                onChange={() => toggleSelection(item.reservationId)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {getParsingStatusIcon(item.parsingStatus)}
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border",
                                                    item.parsingStatus === 'Parsed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                        item.parsingStatus === 'Failed' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                )}>
                                                    {item.parsingStatus}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-black text-slate-900 uppercase tracking-tight text-sm">
                                                {item.guestName && item.guestName !== 'PDF Guest' ? item.guestName : <span className="text-slate-300 font-normal italic">{t('pending')}</span>}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{item.bookingNumber}</div>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-600 text-xs">
                                            {item.checkIn} → {item.checkOut}
                                            <div className="text-[10px] text-slate-400 mt-0.5">{item.nights} {t('nights')}</div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="bg-slate-100 text-slate-700 font-black text-[10px] px-2 py-0.5 rounded-md inline-block">
                                                {item.requestedRooms || 0}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-black text-slate-900">
                                            {hasExtractedData && (item.totalAmount ?? 0) > 0 ? formatCurrency(item.totalAmount ?? 0, item.currency || 'USD') : '—'}
                                        </TableCell>
                                        <TableCell>
                                            {getHintBadge(item.availabilityHint?.bucket)}
                                        </TableCell>
                                        <TableCell className="px-6 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                {item.parsingStatus === 'Parsed' ? (
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-4"
                                                        onClick={() => handleTriggerReview([item.reservationId])}
                                                        disabled={getPlan.isPending && getPlan.variables?.includes(item.reservationId)}
                                                    >
                                                        {getPlan.isPending && getPlan.variables?.includes(item.reservationId) && <Loader2 className="w-3 h-3 me-2 animate-spin" />}
                                                        {t('reception.confirm')}
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest px-4" onClick={() => handleParse(item.reservationId, item.bookingNumber)}>
                                                        {t('reception.parse')}
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-blue-500" onClick={() => setViewingPdfId({ id: item.reservationId, number: item.bookingNumber })}>
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleCancel(item.reservationId, item.bookingNumber)} disabled={user?.role === 'Receptionist'}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                variant={confirmState.variant}
                confirmText={t('confirm', 'Confirm')}
                cancelText={t('cancel', 'Cancel')}
            />

            {/* View PDF Dialog */}
            <Dialog
                open={!!viewingPdfId}
                onOpenChange={(open) => !open && setViewingPdfId(null)}
            >
                <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="hidden">
                        <DialogTitle>PDF Viewer</DialogTitle>
                        <DialogDescription>
                            Preview of the uploaded PDF reservation document.
                        </DialogDescription>
                    </DialogHeader>
                    {viewingPdfId && (
                        <PdfViewer
                            attachmentId={viewingPdfId.id}
                            fileName={`Reservation-${viewingPdfId.number}.pdf`}
                            onClose={() => setViewingPdfId(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <AllocationReviewModal
                isOpen={isReviewOpen}
                plan={allocationPlan}
                isLoading={getPlan.isPending}
                isSubmitting={applyPlan.isPending}
                onClose={() => setIsReviewOpen(false)}
                onConfirm={(request) => {
                    applyPlan.mutate(request, {
                        onSuccess: () => setIsReviewOpen(false)
                    });
                }}
            />

        </div>
    );
};

export default PendingRequests;
