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
import { AlertCircle, RefreshCw, CheckCircle2, XCircle, Clock, FileSearch, CalendarRange, AlertTriangle, Upload, Loader2, Trash2, Eye, CheckCheck } from 'lucide-react';
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



    const handleConfirm = async (id: number, number: string) => {
        setConfirmState({
            isOpen: true,
            title: t('reception.confirm_reservation_title', 'Confirm Reservation'),
            description: `${t('reception.confirm_prompt', 'Are you sure you want to confirm reservation')} ${number}?`,
            onConfirm: async () => {
                closeConfirm();
                try {
                    await confirm.mutateAsync(id);
                    toast.success(t('reception.confirm_success', 'Reservation confirmed successfully.'));
                    refetch();
                } catch (err: unknown) {
                    const errorMessage = extractErrorMessage(err);
                    if (errorMessage === 'Cannot create reservation with a past check-in date.') {
                        toast.error(t('errors.past_date', 'الحجز لم يتم لأن تاريخ الوصول في الماضي'));
                    } else {
                        toast.error(errorMessage);
                    }
                }
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

        getPlan.mutate(targetIds, {
            onSuccess: (plan) => {
                setAllocationPlan(plan);
                setIsReviewOpen(true);
            }
        });
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {t('reception.pending_requests', 'Pending PDF Requests')}
                </h1>
                <div className="flex items-center gap-3">
                    <DatePickerWithRange
                        date={dateRange}
                        setDate={setDateRange}
                        className="w-full md:w-auto"
                    />
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <Button
                                variant="secondary"
                                className="h-10 px-4 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm"
                                onClick={() => handleBatchParse()}
                                disabled={batchParse.isPending}
                            >
                                {batchParse.isPending ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <FileSearch className="w-4 h-4 me-2" />}
                                {t('reception.parse_selected', 'Parse Selected ({{count}})', { count: selectedIds.length })}
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            className="h-10 px-4 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 shadow-sm"
                            onClick={handleParseAllPending}
                            disabled={batchParse.isPending || !data?.items.some(i => i.parsingStatus === 'Pending' || i.parsingStatus === 'Failed')}
                        >
                            <RefreshCw className={cn("w-4 h-4 me-2", batchParse.isPending && "animate-spin")} />
                            {t('reception.parse_all_pending', 'Parse All Pending')}
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-10 px-4 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm"
                            onClick={handleConfirmAll}
                            disabled={isLoading || getPlan.isPending || !data?.items.some(i => i.parsingStatus === 'Parsed')}
                        >
                            {getPlan.isPending ? (
                                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                            ) : (
                                <CheckCheck className="w-4 h-4 me-2" />
                            )}
                            {t('reception.confirm_all', 'Confirm All Parsed')}
                        </Button>
                        <div className="relative w-48">
                            <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                                <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white shadow-sm transition-all focus:ring-slate-900/5">
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
                        </div>
                        <Button
                            variant="default"
                            className="h-10 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all active:scale-95"
                            onClick={() => {
                                if (!selectedListingId) {
                                    toast.error(t('reception.listing_required'));
                                } else {
                                    document.getElementById('pdf-upload')?.click();
                                }
                            }}
                            disabled={uploadBatch.isPending || !selectedListingId}
                        >
                            <Upload className={cn("w-4 h-4 me-2", uploadBatch.isPending && "animate-bounce")} />
                            {uploadBatch.isPending ? t('common.uploading', 'Uploading...') : t('reception.upload_pdfs', 'Upload PDFs')}
                        </Button>
                        <input
                            id="pdf-upload"
                            type="file"
                            accept=".pdf"
                            multiple
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-900 shadow-sm" onClick={() => refetch()} disabled={isLoading}>
                            <RefreshCw className={cn("h-4 w-4 text-slate-500", isLoading && "animate-spin")} />
                        </Button>
                    </div>
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
                                    t('common.service_error', 'System Connection Error')}
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
                                    {t('common.reconnect', 'Reconnect Now')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Totals Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                ) : data && (
                    <>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="p-4 pb-0">
                                <CardTitle className="text-xs font-medium text-slate-500 uppercase">{t('common.total', 'Total')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1">
                                <div className="text-2xl font-bold">{data.totals.count}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="p-4 pb-0">
                                <CardTitle className="text-xs font-medium text-emerald-600 uppercase">{t('reception.safe', 'Safe')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1">
                                <div className="text-2xl font-bold">{data.totals.safeCount}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="p-4 pb-0">
                                <CardTitle className="text-xs font-medium text-amber-600 uppercase">{t('reception.tight', 'Tight')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1">
                                <div className="text-2xl font-bold">{data.totals.tightCount}</div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-sm">
                            <CardHeader className="p-4 pb-0">
                                <CardTitle className="text-xs font-medium text-red-600 uppercase">{t('reception.overbook', 'Overbook')}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1">
                                <div className="text-2xl font-bold">{data.totals.overbookCount}</div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-10 px-4">
                                <Checkbox
                                    checked={data?.items.length ? selectedIds.length === data.items.length : false}
                                    onChange={() => toggleSelectAll()}
                                />
                            </TableHead>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>{t('reception.guest_info', 'Guest / Booking')}</TableHead>
                            <TableHead>{t('reception.dates', 'Dates')}</TableHead>
                            <TableHead className="text-center">{t('reception.rooms', 'Rooms')}</TableHead>
                            <TableHead className="text-right">{t('common.total', 'Total')}</TableHead>
                            <TableHead>{t('reception.availability', 'Availability')}</TableHead>
                            <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : data?.items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <div className="font-medium">{t('reception.no_pending', 'No pending requests found.')}</div>
                                    <div className="text-sm">{t('reception.no_pending_desc', 'Try changing the date range or check back later.')}</div>
                                </TableCell>
                            </TableRow>
                        ) : data?.items.map((item) => {
                            const isParsingThis = parse.isPending && parse.variables === item.reservationId;
                            const isConfirmingThis = confirm.isPending && confirm.variables === item.reservationId;
                            const isDeletingThis = deletePending.isPending && deletePending.variables?.id === item.reservationId;
                            const isPending = isParsingThis || isConfirmingThis || isDeletingThis;

                            const hasExtractedData = item.parsingStatus === 'Parsed' ||
                                (item.parsingStatus === 'Failed' && item.guestName && item.guestName !== 'PDF Guest' && item.guestName !== 'Unknown');

                            return (
                                <TableRow key={item.reservationId} className={cn("group hover:bg-slate-50/50 transition-colors", isPending && "opacity-50 pointer-events-none")}>
                                    <TableCell className="px-4">
                                        <Checkbox
                                            checked={selectedIds.includes(item.reservationId)}
                                            onChange={() => toggleSelection(item.reservationId)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5" title={item.errorMessage || item.errorCode || item.parsingStatus}>
                                                {getParsingStatusIcon(item.parsingStatus, item.errorCode)}
                                                <span className={cn(
                                                    "text-xs font-semibold",
                                                    item.parsingStatus === 'Parsed' ? "text-emerald-700" :
                                                        item.parsingStatus === 'Failed' ? "text-red-700" : "text-amber-700"
                                                )}>
                                                    {item.parsingStatus}
                                                </span>
                                            </div>
                                            {item.parsingStatus === 'Failed' && (
                                                <div className="mt-1 flex flex-col gap-0.5 ml-5">
                                                    <span className="text-[10px] text-red-600 font-medium leading-tight">
                                                        {item.errorMessage || `Parsing error: ${item.errorCode || 'UNKNOWN'}`}
                                                    </span>
                                                    {item.errorCode && item.errorMessage && (
                                                        <span className="text-[8px] text-red-400 font-mono">
                                                            Code: {item.errorCode}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="font-bold text-slate-900 leading-tight">
                                                {item.guestName && item.guestName !== 'PDF Guest' && item.guestName !== 'Unknown'
                                                    ? item.guestName
                                                    : <span className="text-slate-400 font-normal italic">{t('common.pending_extraction', 'Pending extraction')}</span>}
                                            </div>

                                            {/* Booking Info on separate line */}
                                            {item.bookingNumber && !item.bookingNumber.startsWith('PDF-') ? (
                                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                                    <span className="text-slate-400 font-normal">
                                                        {item.bookingNumber.includes(':') ? '' : t('reception.booking_number_label', 'Booking Number: ')}
                                                    </span>
                                                    {item.bookingNumber}
                                                </div>
                                            ) : null}

                                            {item.hotelName && (
                                                <div className="text-[10px] text-slate-400 font-medium italic mt-0.5">
                                                    {item.hotelName}
                                                </div>
                                            )}
                                            {item.phone && <div className="text-[11px] text-slate-400 mt-0.5">{item.phone}</div>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {hasExtractedData && item.checkIn && item.checkOut ? (
                                            <>
                                                <div className="text-sm text-slate-700 font-medium">{item.checkIn} — {item.checkOut}</div>
                                                <div className="text-[11px] text-slate-400">{item.nights} {t('common.nights', 'nights')}</div>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium h-5">
                                            {hasExtractedData ? (item.requestedRooms ?? '—') : '—'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {hasExtractedData && item.totalAmount && item.totalAmount > 0 ? (
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-slate-900">
                                                    {formatCurrency(item.totalAmount, item.currency || 'USD')}
                                                </span>
                                                {item.currency && (
                                                    <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-50 px-1 rounded border border-slate-100">
                                                        {item.currency}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {getHintBadge(item.availabilityHint?.bucket)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Parse Button */}
                                            {(item.parsingStatus === 'Pending' || item.parsingStatus === 'Failed') && (
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 border-slate-200 hover:bg-slate-50 text-slate-700"
                                                        onClick={() => handleParse(item.reservationId, item.bookingNumber)}
                                                        disabled={isParsingThis || isPending}
                                                    >
                                                        {isParsingThis ? (
                                                            <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />
                                                        ) : (
                                                            <FileSearch className="w-3.5 h-3.5 me-1.5" />
                                                        )}
                                                        {isParsingThis
                                                            ? t('reception.parsing', 'Parsing...')
                                                            : item.parsingStatus === 'Failed'
                                                                ? t('reception.retry', 'Retry')
                                                                : t('reception.parse', 'Parse')}
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 border-slate-200 hover:bg-slate-50 text-slate-700"
                                                        onClick={() => setViewingPdfId({ id: item.reservationId, number: item.bookingNumber })}
                                                        title={t('attachments.view_pdf', 'View PDF')}
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Confirm Button */}
                                            {item.parsingStatus === 'Parsed' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        className="bg-slate-900 text-white hover:bg-slate-800 h-8"
                                                        onClick={() => handleConfirm(item.reservationId, item.bookingNumber)}
                                                        disabled={isPending}
                                                        title={t('reception.confirm', 'Confirm')}
                                                    >
                                                        {t('reception.confirm', 'Confirm')}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                        onClick={() => handleParse(item.reservationId, item.bookingNumber)}
                                                        disabled={isParsingThis || isPending}
                                                        title={t('reception.reparse', 'Re-parse')}
                                                    >
                                                        <RefreshCw className={cn("w-3.5 h-3.5", isParsingThis && "animate-spin")} />
                                                    </Button>
                                                </>
                                            )}

                                            {/* View Button (Parsed) */}
                                            {item.parsingStatus === 'Parsed' && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0"
                                                    onClick={() => setViewingPdfId({ id: item.reservationId, number: item.bookingNumber })}
                                                    title={t('attachments.view_pdf', 'View PDF')}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            )}

                                            {/* Cancel/Delete Button */}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"
                                                onClick={() => handleCancel(item.reservationId, item.bookingNumber)}
                                                disabled={isPending || user?.role === 'Receptionist'}
                                                title={user?.role === 'Receptionist' ? t('reception.cancel_restricted', 'Cancel restricted for receptionists') : t('reception.cancel', 'Cancel')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                variant={confirmState.variant}
                confirmText={t('common.confirm', 'Confirm')}
                cancelText={t('common.cancel', 'Cancel')}
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
