import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { useReservationDetails } from '@/hooks/reservations/useReservationDetails';
import { useReservationActions } from '@/hooks/reservations/useReservationActions';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    CalendarDays,
    User,
    Wallet,
    Phone,
    Bed,
    CheckCircle2,
    XCircle,
    LogIn,
    LogOut,
    Trash2,
    FileText,
    Loader2,
    Pencil,
    Hash,
    ChevronRight,
    Building2,
    Zap,
    Briefcase,
    AlertCircle
} from 'lucide-react';
import { getAttachmentMetadata } from '@/api/attachments';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import { ReservationStatus, ReservationSource, PaymentMethodLabels, CurrencyCodeLabels, CurrencyCodeEnum } from '@/api/types/reservations';
import { cn, formatCurrency, extractErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/reservation/StatusBadge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useState } from 'react';
import { EditReservationDialog } from '@/pages/reservations/components/EditReservationDialog';
import { useGetConfirmationPlan, useApplyConfirmationPlan } from '@/features/reception/hooks/useBulkConfirmation';
import { AllocationReviewModal } from '@/pages/reception/components/AllocationReviewModal';
import type { ReservationAllocationPlanDto } from '@/api/types/reception';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';

/**
 * Ras Sedr Rental - Stay Operations Detail
 * High-impact operational view for single stay management, financial audit, and lifecycle control.
 */

const ReservationDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const isReceptionFlow = location.pathname.includes('/reception/');
    const backPath = isReceptionFlow ? '/reception/today' : '/reservations';

    const reservationId = Number(id);
    const [isDeleted, setIsDeleted] = useState(false);
    const { user } = useAuth();
    const isAdmin = user?.role === 'Administrator';

    const { data: res, isLoading, isError, error, refetch } = useReservationDetails(reservationId, { enabled: !isDeleted });
    const actions = useReservationActions();
    const { businessDate } = useBusinessDate();

    const [isEditOpen, setIsEditOpen] = useState(false);
    const getPlan = useGetConfirmationPlan();
    const applyPlan = useApplyConfirmationPlan();
    const [allocationPlan, setAllocationPlan] = useState<ReservationAllocationPlanDto | null>(null);
    const [isAllocationOpen, setIsAllocationOpen] = useState(false);

    const [attachment, setAttachment] = useState<any>(null);
    const [isCheckingAttachment, setIsCheckingAttachment] = useState(false);

    const handleViewPdf = async () => {
        if (attachment) return;
        try {
            setIsCheckingAttachment(true);
            const meta = await getAttachmentMetadata(reservationId);
            if (meta) {
                setAttachment(meta);
            } else {
                toast.info(t('attachments.none_found'));
            }
        } catch (_err) { } finally {
            setIsCheckingAttachment(false);
        }
    };

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

    const closeConfirm = () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setDeleteReason('');
    };

    const [deleteReason, setDeleteReason] = useState('');

    const handleDelete = () => {
        setConfirmState({
            isOpen: true,
            title: t('reservations.delete_title'),
            description: t('reservations.delete_confirm'),
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await actions.remove.mutateAsync({ id: reservationId, reason: deleteReason });
                    setIsDeleted(true);
                    toast.success(t('reservations.delete_success'));
                    navigate(backPath);
                } catch (err: unknown) {
                    toast.error(`Error: ${extractErrorMessage(err)}`);
                } finally {
                    closeConfirm();
                }
            }
        });
    };

    const handleAction = async (type: string, actionFn: (id: number) => Promise<unknown>) => {
        const title = type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
        const description = `${t('are_you_sure')} ${type}?`;

        setConfirmState({
            isOpen: true,
            title,
            description,
            variant: type === 'cancel' ? 'destructive' : 'default',
            onConfirm: async () => {
                closeConfirm();
                try {
                    await actionFn(reservationId);
                    toast.success(`${title} successful!`);
                    refetch();
                } catch (err: unknown) {
                    const errorMessage = extractErrorMessage(err);
                    if (errorMessage.includes('not available')) {
                        toast.info(t('reservations.finding_alternatives'));
                        handleConfirmFlow();
                    } else {
                        toast.error(`Error: ${errorMessage}`);
                    }
                }
            }
        });
    };

    const handleConfirmFlow = () => {
        getPlan.mutate([reservationId], {
            onSuccess: (data) => {
                setAllocationPlan(data);
                setIsAllocationOpen(true);
            },
            onError: (err) => {
                toast.error(extractErrorMessage(err));
            }
        });
    };

    if (isLoading) return <ReservationDetailsSkeleton />;

    if (isError || !res) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                <XCircle className="w-16 h-16 text-rose-500 mb-6" />
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">{t('reservations.error_loading')}</h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">{error instanceof Error ? error.message : 'Operational Fault'}</p>
                <Button onClick={() => navigate(backPath)} className="bg-slate-900 rounded-2xl h-12 px-8 font-black text-[10px] uppercase tracking-widest">Return to Ledger</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-28 lg:pb-8">
            {/* TOP NAVIGATION & CONTEXT */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(backPath)}
                        className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-black text-slate-900 leading-none uppercase tracking-tighter">
                                {res.guestName}
                            </h1>
                            <StatusBadge status={res.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            <Hash className="w-3 h-3 text-slate-300" />
                            <span>STAY ID: {res.id}</span>
                            {res.bookingNumber && (
                                <>
                                    <span className="opacity-20">|</span>
                                    <span>REF: {res.bookingNumber}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {isAdmin && res.status !== ReservationStatus.CheckedOut && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl h-10 w-10 transition-colors"
                        onClick={handleDelete}
                        disabled={actions.remove.isPending}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* STICKY OPERATIONAL ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto">
                <div className="pointer-events-auto mx-auto max-w-md sm:mx-0 px-3 pb-3 sm:p-0">
                    <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 px-3 py-3 rounded-2xl shadow-2xl shadow-black/30 flex items-center gap-3 ring-1 ring-white/5">
                        {(res.status === ReservationStatus.Draft || res.status === ReservationStatus.Confirmed) && (
                            <>
                                <Button
                                    variant="ghost"
                                    onClick={() => setIsEditOpen(true)}
                                    className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wide transition-all active:scale-[0.97]"
                                >
                                    <Pencil className="w-4 h-4 mr-2 opacity-80" />
                                    {t('edit')}
                                </Button>
                                <Button
                                    className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wide shadow-lg shadow-blue-600/30 transition-all active:scale-[0.97]"
                                    onClick={() => handleConfirmFlow()}
                                    disabled={getPlan.isPending}
                                >
                                    {getPlan.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    {t('reservations.confirm')}
                                </Button>
                            </>
                        )}

                        {res.status === ReservationStatus.Confirmed && (
                            <>
                                <Button
                                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wide shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.97]"
                                    onClick={() => handleAction('check-in', (id) => actions.checkIn.mutateAsync({ id, businessDate }))}
                                    disabled={actions.checkIn.isPending}
                                >
                                    <LogIn className="w-4 h-4 mr-2" />
                                    {t('reservations.check_in')}
                                </Button>

                                <Button
                                    variant="ghost"
                                    className="flex-none h-12 w-12 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-all active:scale-[0.97]"
                                    onClick={() => handleAction('cancel', (id) => actions.cancel.mutateAsync(id))}
                                    disabled={actions.cancel.isPending || user?.role === 'Receptionist'}
                                >
                                    <XCircle className="w-5 h-5" />
                                </Button>
                            </>
                        )}

                        {res.status === ReservationStatus.CheckedIn && (
                            <Button
                                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wide shadow-lg shadow-blue-600/30 transition-all active:scale-[0.97]"
                                onClick={() => handleAction('check-out', (id) => actions.checkOut.mutateAsync({ id, businessDate }))}
                                disabled={actions.checkOut.isPending}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                {t('reservations.check_out')}
                            </Button>
                        )}

                        {res.status === ReservationStatus.CheckedOut && (
                            <div className="flex-1 h-12 flex items-center justify-center text-[11px] font-bold text-slate-500 uppercase tracking-widest italic">
                                Archive Sealed
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PRIMARY DATA GRID */}
                <div className="lg:col-span-2 space-y-6">
                    {/* TIMELINE OVERVIEW */}
                    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white group">
                        <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded-xl"><CalendarDays className="w-4 h-4 text-blue-600" /></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reservations.stay_info')}</span>
                            </div>
                            <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-tighter">
                                {res.lines[0]?.nights || 0} Night Duration
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between bg-slate-50 rounded-[28px] p-6 border border-slate-100 relative shadow-inner">
                                <div className="flex-1 text-center group">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('reservations.check_in')}</span>
                                    <div className="text-xl font-black text-slate-900 tracking-tighter">
                                        {format(parseISO(res.checkInDate), 'MMM d, yyyy')}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(parseISO(res.checkInDate), 'EEEE')}</span>
                                </div>
                                <div className="p-4 bg-white rounded-full shadow-lg border border-slate-100 z-10 scale-110">
                                    <ChevronRight className="w-6 h-6 text-slate-900" />
                                </div>
                                <div className="flex-1 text-center group">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('reservations.check_out')}</span>
                                    <div className="text-xl font-black text-slate-900 tracking-tighter">
                                        {format(parseISO(res.checkOutDate), 'MMM d, yyyy')}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(parseISO(res.checkOutDate), 'EEEE')}</span>
                                </div>
                            </div>

                            {res.hotelName && (
                                <div className="mt-6 flex items-center justify-center gap-2 py-3 bg-slate-900 rounded-2xl shadow-xl">
                                    <Building2 className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                        {res.hotelName}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ACCOMMODATION BREAKDOWN */}
                    <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                        <CardHeader className="p-6 pb-0 flex items-center gap-2">
                            <div className="p-2 bg-emerald-50 rounded-xl"><Bed className="w-4 h-4 text-emerald-600" /></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reservations.rooms_and_rates')}</span>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3">
                            {res.lines.map((line) => (
                                <div key={line.id} className="flex items-center justify-between p-5 rounded-[24px] border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200 transition-all shadow-sm group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-900 font-black text-xs shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                                            {line.roomNumber || '—'}
                                        </div>
                                        <div className="space-y-1">
                                            <div className="font-black text-slate-900 uppercase tracking-tighter text-sm">
                                                {line.roomNumber ? `Unit Assignment #${line.roomNumber}` : t('reservations.unassigned')}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest">
                                                <span>{line.roomTypeName}</span>
                                                {line.nights > 0 && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md text-[8px] font-black">{line.nights} NTS</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-900 text-lg tracking-tighter">
                                            {formatCurrency(line.ratePerNight, res.currency)}
                                        </div>
                                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest line-through decoration-slate-200">
                                            {formatCurrency(line.lineTotal, res.currency)} AGGREGATE
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* SECONDARY SIDEBAR */}
                <div className="space-y-6">
                    {/* FINANCIAL AUDIT - SIGNATURE NAVY CARD */}
                    <Card className="border-none shadow-2xl bg-slate-900 text-white rounded-[32px] overflow-hidden relative group">
                        <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />

                        <CardHeader className="p-6 pb-2 relative z-10 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-blue-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reservations.payment_summary')}</span>
                                </div>
                                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                            </div>
                        </CardHeader>

                        <CardContent className="p-8 relative z-10 space-y-6">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">{t('reservations.total_amount')}</span>
                                <h3 className="text-4xl font-black text-white tracking-tighter">
                                    {formatCurrency(res.totalAmount, res.currency)}
                                </h3>
                            </div>

                            {res.balanceDue > 0 && (
                                <div className="flex flex-col gap-1 p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{t('reservations.balance_due')}</span>
                                        <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                                    </div>
                                    <span className="text-xl font-black text-orange-400 tracking-tighter">
                                        {formatCurrency(res.balanceDue, res.currency)}
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Settlement</span>
                                    <div className="text-xs font-black text-slate-300 uppercase tracking-tight truncate">{PaymentMethodLabels[res.paymentMethod] || '—'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Denom</span>
                                    <div className="text-xs font-black text-slate-300 uppercase tracking-tight">
                                        {res.currencyCode === CurrencyCodeEnum.Other ? res.currencyOther : CurrencyCodeLabels[res.currencyCode]}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge className={cn(
                                    "px-3 py-1 rounded-xl font-black text-[8px] uppercase tracking-widest border-none shadow-lg",
                                    res.paidAtArrival ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                                )}>
                                    {res.paidAtArrival ? 'COLLECT @ ARRIVAL' : 'RESERVATION PREPAID'}
                                </Badge>
                                <Badge className="bg-white/10 text-white border-none px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest">
                                    LEDGER #10{res.id}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* GUEST CAPTURE */}
                    <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden h-fit">
                        <CardHeader className="p-6 pb-0 flex items-center gap-2">
                            <div className="p-2 bg-slate-100 rounded-xl"><User className="w-4 h-4 text-slate-600" /></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reservations.guest_details')}</span>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{t('reservations.guest')}</div>
                                <div className="text-lg font-black text-slate-900 uppercase tracking-tighter">{res.guestName}</div>
                            </div>
                            {res.phone && (
                                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[20px] border border-slate-100">
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm"><Phone className="w-4 h-4 text-blue-500" /></div>
                                    <div className="space-y-0.5">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operational Contact</span>
                                        <div className="text-sm font-black text-slate-700 tracking-tight">{res.phone}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* DOCUMENTATION ARTIFACTS */}
                    {(res.source === ReservationSource.PDF || res.source === ReservationSource.WhatsApp) && (
                        <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden h-fit">
                            <CardHeader className="p-6 pb-0 flex items-center gap-2">
                                <div className="p-2 bg-slate-100 rounded-xl"><Briefcase className="w-4 h-4 text-slate-600" /></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('attachments.title')}</span>
                            </CardHeader>
                            <CardContent className="p-6">
                                {attachment ? (
                                    <AttachmentList
                                        attachments={[attachment]}
                                        reservationId={reservationId}
                                    />
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full h-16 rounded-[24px] border-2 border-dashed border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-1 group"
                                        onClick={handleViewPdf}
                                        disabled={isCheckingAttachment}
                                    >
                                        {isCheckingAttachment ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                        ) : (
                                            <FileText className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                        )}
                                        <span className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-blue-600">
                                            {isCheckingAttachment ? 'Authenticating Artifact...' : 'Retrieve Source Document'}
                                        </span>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* MODALS & DIALOGS */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                variant={confirmState.variant}
                confirmText={t('confirm')}
                cancelText={t('cancel')}
            >
                {confirmState.title === t('reservations.delete_title') && (
                    <div className="space-y-4 pt-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Audit Deletion Reason (Required)
                        </label>
                        <textarea
                            className="w-full min-h-[120px] p-4 text-xs font-bold bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all shadow-inner"
                            placeholder="State rationale for removing this record from active ledger..."
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value.slice(0, 200))}
                            maxLength={200}
                        />
                    </div>
                )}
            </ConfirmDialog>

            {res && (
                <EditReservationDialog
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    reservation={res}
                    onSubmit={async (id, cmd) => {
                        await actions.update.mutateAsync({ id, command: cmd });
                        setIsEditOpen(false);
                    }}
                    isSubmitting={actions.update.isPending}
                />
            )}

            {allocationPlan && (
                <AllocationReviewModal
                    isOpen={isAllocationOpen}
                    onClose={() => setIsAllocationOpen(false)}
                    plan={allocationPlan}
                    isLoading={getPlan.isPending}
                    onConfirm={async (req) => {
                        try {
                            await applyPlan.mutateAsync(req);
                            setIsAllocationOpen(false);
                            refetch();
                        } catch (_err) { }
                    }}
                    isSubmitting={applyPlan.isPending}
                />
            )}
        </div >
    );
};

const ReservationDetailsSkeleton = () => (
    <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-2xl bg-slate-100" />
            <div className="space-y-3">
                <Skeleton className="h-8 w-64 bg-slate-100 rounded-lg" />
                <Skeleton className="h-4 w-40 bg-slate-100 rounded-lg" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-64 w-full rounded-[40px] bg-slate-50" />
                <Skeleton className="h-80 w-full rounded-[40px] bg-slate-50" />
            </div>
            <div className="space-y-8">
                <Skeleton className="h-72 w-full rounded-[40px] bg-slate-900" />
                <Skeleton className="h-56 w-full rounded-[40px] bg-slate-50" />
            </div>
        </div>
    </div>
);

export default ReservationDetails;
