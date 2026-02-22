import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { useReservationDetails } from '@/hooks/reservations/useReservationDetails';
import { useReservationActions } from '@/hooks/reservations/useReservationActions';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    UserMinus,
    LogIn,
    LogOut,
    Trash2,
    FileText,
    Loader2,
    Pencil,
    Banknote,
    Hash,
    ChevronRight,
    MapPin
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

    // Add Edit Dialog state
    const [isEditOpen, setIsEditOpen] = useState(false);

    // Confirmation Plan Logic
    const getPlan = useGetConfirmationPlan();
    const applyPlan = useApplyConfirmationPlan();
    const [allocationPlan, setAllocationPlan] = useState<ReservationAllocationPlanDto | null>(null);
    const [isAllocationOpen, setIsAllocationOpen] = useState(false);

    // Lazy-load attachment metadata
    const [attachment, setAttachment] = useState<any>(null);
    const [isCheckingAttachment, setIsCheckingAttachment] = useState(false);

    const handleViewPdf = async () => {
        if (attachment) return; // Already loaded

        try {
            setIsCheckingAttachment(true);
            const meta = await getAttachmentMetadata(reservationId);
            if (meta) {
                setAttachment(meta);
            } else {
                toast.info(t('attachments.none_found', 'No PDF document associated with this reservation.'));
            }
        } catch (_err) {
            // Error logged by http interceptor
        } finally {
            setIsCheckingAttachment(false);
        }
    };

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

    const closeConfirm = () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setDeleteReason('');
    };

    const [deleteReason, setDeleteReason] = useState('');

    const handleDelete = () => {
        setConfirmState({
            isOpen: true,
            title: t('reservations.delete_title', 'Delete Reservation'),
            description: t('reservations.delete_confirm', 'Are you sure you want to delete this reservation? This will remove it from all regular views but keep it in audit logs.'),
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await actions.remove.mutateAsync({ id: reservationId, reason: deleteReason });
                    setIsDeleted(true); // Disable query immediately to prevent 404
                    toast.success(t('reservations.delete_success', 'Reservation deleted successfully!'));
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
        const description = `${t('common.are_you_sure', 'Are you sure you want to')} ${type}?`;

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
                    if (errorMessage === 'Cannot create reservation with a past check-in date.') {
                        toast.error(t('errors.past_date', 'الحجز لم يتم لأن تاريخ الوصول في الماضي'));
                    } else if (errorMessage.includes('not available')) {
                        // If room is busy, trigger the allocation flow automatically
                        toast.info(t('reservations.finding_alternatives', 'Room is busy. Finding alternatives...'));
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
            <div className="p-8 text-center space-y-4">
                <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-bold">{t('reservations.error_loading', 'Failed to load reservation')}</h2>
                <p className="text-slate-500">{error instanceof Error ? error.message : 'Unknown error'}</p>
                <Button onClick={() => navigate(backPath)}>{t('common.back_to_list', 'Back to List')}</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 lg:pb-0">
            {/* Top Navigation & Status */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(backPath)}
                        className="h-10 w-10 rounded-full border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-none uppercase tracking-tight">
                                {res.guestName}
                            </h1>
                            <StatusBadge status={res.status} className="mt-0.5" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Hash className="w-3 h-3" />
                            <span>ID: {res.id}</span>
                            {res.bookingNumber && (
                                <>
                                    <span className="opacity-30">•</span>
                                    <span>{res.bookingNumber}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {isAdmin && res.status !== ReservationStatus.CheckedOut && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full h-9 w-9"
                        onClick={handleDelete}
                        disabled={actions.remove.isPending}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Sticky Action Bar (Fixed at bottom on mobile, inline-ish but fixed-ready on desktop) */}
            <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-auto z-50 p-4 sm:p-0 pointer-events-none">
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 p-2 rounded-2xl sm:rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto max-w-lg mx-auto sm:mx-0">
                    {(res.status === ReservationStatus.Draft || res.status === ReservationStatus.Confirmed) && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditOpen(true)}
                                className="flex-1 sm:flex-none h-11 sm:h-10 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-600"
                            >
                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                {t('common.edit')}
                            </Button>
                            <Button
                                className="flex-1 sm:flex-none h-11 sm:h-10 rounded-xl bg-slate-900 border-none font-black text-[10px] uppercase tracking-widest"
                                onClick={() => handleConfirmFlow()}
                                disabled={getPlan.isPending}
                            >
                                {getPlan.isPending ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                                {t('reservations.confirm')}
                            </Button>
                        </>
                    )}

                    {res.status === ReservationStatus.Confirmed && (
                        <>
                            <Button
                                className="flex-1 sm:flex-none h-11 sm:h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest"
                                onClick={() => handleAction('check-in', (id) => actions.checkIn.mutateAsync({ id, businessDate }))}
                                disabled={actions.checkIn.isPending}
                            >
                                <LogIn className="w-3.5 h-3.5 mr-2" />
                                {t('reservations.check_in')}
                            </Button>

                            <Button
                                variant="outline"
                                className="flex-1 sm:flex-none h-11 sm:h-10 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500"
                                onClick={() => handleAction('no-show', (id) => actions.noShow.mutateAsync({ id, businessDate }))}
                                disabled={actions.noShow.isPending}
                            >
                                <UserMinus className="w-3.5 h-3.5 mr-2" />
                                {t('reservations.no_show')}
                            </Button>

                            <Button
                                variant="ghost"
                                className="flex-none w-11 sm:w-10 h-11 sm:h-10 rounded-xl text-rose-500 hover:bg-rose-50"
                                onClick={() => handleAction('cancel', (id) => actions.cancel.mutateAsync(id))}
                                disabled={actions.cancel.isPending || user?.role === 'Receptionist'}
                            >
                                <XCircle className="w-5 h-5" />
                            </Button>
                        </>
                    )}

                    {res.status === ReservationStatus.CheckedIn && (
                        <Button
                            className="w-full sm:w-auto h-11 sm:h-10 rounded-xl bg-purple-600 hover:bg-purple-700 font-black text-[10px] uppercase tracking-widest"
                            onClick={() => handleAction('check-out', (id) => actions.checkOut.mutateAsync({ id, businessDate }))}
                            disabled={actions.checkOut.isPending || (!isAdmin && res.checkOutDate.split('T')[0] !== businessDate)}
                        >
                            <LogOut className="w-3.5 h-3.5 mr-2" />
                            {t('reservations.check_out')}
                        </Button>
                    )}

                    {res.status === ReservationStatus.CheckedOut && (
                        <div className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                            {t('status.completed', 'Reservation Completed')}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stay Info Card - Compact Horizontal */}
                    <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="p-4 pb-2 bg-slate-50/50">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {t('reservations.stay_info')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center justify-between text-center">
                                <div className="flex-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{t('reservations.check_in')}</div>
                                    <div className="text-sm sm:text-lg font-black text-slate-900 leading-tight">
                                        {format(parseISO(res.checkInDate), 'MMM d, yyyy')}
                                    </div>
                                </div>
                                <div className="px-4 text-slate-200">
                                    <ChevronRight className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{t('reservations.check_out')}</div>
                                    <div className="text-sm sm:text-lg font-black text-slate-900 leading-tight">
                                        {format(parseISO(res.checkOutDate), 'MMM d, yyyy')}
                                    </div>
                                </div>
                            </div>

                            {res.hotelName && (
                                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                                    <MapPin className="w-3.5 h-3.5 text-slate-300" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">
                                        {res.hotelName}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Rooms Card - Optimized Density */}
                    <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
                        <CardHeader className="p-4 pb-2 bg-slate-50/50">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Bed className="w-3.5 h-3.5" />
                                {t('reservations.rooms_and_rates')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2">
                            {res.lines.map((line) => (
                                <div key={line.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-50 bg-slate-50/30 group hover:bg-slate-50 transition-colors">
                                    <div className="space-y-0.5">
                                        <div className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight">
                                            {line.roomNumber ? `Room ${line.roomNumber}` : t('reservations.unassigned')}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-tighter">
                                            <span>{line.roomTypeName}</span>
                                            <span className="opacity-30">•</span>
                                            <span className="text-blue-600">{line.nights} {t('common.nights')}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-slate-900 text-xs sm:text-sm">
                                            {formatCurrency(line.ratePerNight, res.currency)}
                                            <span className="text-[8px] text-slate-300 ml-1 font-bold">/N</span>
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {formatCurrency(line.lineTotal, res.currency)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Guest Section */}
                    <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden h-fit">
                        <CardHeader className="p-4 pb-2 bg-slate-50/50">
                            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-3.5 h-3.5" />
                                {t('reservations.guest_details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-1">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('reservations.guest')}</div>
                                <div className="text-sm font-black text-slate-900 uppercase">{res.guestName}</div>
                            </div>
                            {res.phone && (
                                <div className="space-y-1">
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('common.phone')}</div>
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                        <Phone className="w-3.5 h-3.5 text-slate-300" />
                                        <span>{res.phone}</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment Section - Premium High-Density */}
                    <Card className="border-none shadow-xl bg-slate-900 text-white rounded-2xl overflow-hidden relative h-fit group">
                        {/* Decorative glow effect */}
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-colors" />

                        <CardHeader className="pb-3 border-b border-white/5 relative z-10">
                            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Wallet className="w-3 h-3 text-blue-400" />
                                {t('reservations.payment_summary', 'Payment Summary')}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="pt-6 pb-6 space-y-6 relative z-10">
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-400 uppercase tracking-tight font-medium">
                                    {t('reservations.total_amount', 'Total Amount')}
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black tracking-tighter text-white">
                                        {formatCurrency(res.totalAmount, res.currency)}
                                    </span>
                                </div>
                            </div>

                            {/* Balance Due */}
                            {res.balanceDue > 0 && (
                                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                                    <div className="flex items-center gap-2">
                                        <Banknote className="w-3.5 h-3.5 text-orange-400" />
                                        <span className="text-[10px] text-slate-400 uppercase tracking-tight font-medium">
                                            {t('reservations.balance_due', 'Balance Due')}
                                        </span>
                                    </div>
                                    <span className="text-lg font-bold text-orange-400">
                                        {formatCurrency(res.balanceDue, res.currency)}
                                    </span>
                                </div>
                            )}

                            {/* Payment Method & Currency */}
                            <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                                <div className="flex-1">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-tight">{t('reservations.payment_method', 'Payment')}</div>
                                    <div className="text-sm font-semibold text-slate-200">
                                        {PaymentMethodLabels[res.paymentMethod] || '—'}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-tight">{t('reservations.currency', 'Currency')}</div>
                                    <div className="text-sm font-semibold text-slate-200">
                                        {res.currencyCode === CurrencyCodeEnum.Other
                                            ? res.currencyOther || 'Other'
                                            : CurrencyCodeLabels[res.currencyCode] || res.currency}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "px-2 py-0.5 rounded-md border-none text-[10px] font-bold uppercase tracking-wider",
                                        res.paidAtArrival
                                            ? "bg-amber-500/10 text-amber-400"
                                            : "bg-emerald-500/10 text-emerald-400"
                                    )}
                                >
                                    {res.paidAtArrival ? t('reservations.pay_at_arrival', 'PAY AT ARRIVAL') : t('reservations.prepaid', 'PREPAID')}
                                </Badge>

                                {res.status === ReservationStatus.Confirmed && (
                                    <Badge variant="outline" className="bg-blue-500/10 border-none text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                        {t('reservations.status_secured', 'Secured')}
                                    </Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>



                    {/* Attachments Section - Simplified */}
                    {(res.source === ReservationSource.PDF || res.source === ReservationSource.WhatsApp) && (
                        <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden h-fit">
                            <CardHeader className="p-4 pb-2 bg-slate-50/50">
                                <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    {t('attachments.title')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {attachment ? (
                                    <AttachmentList
                                        attachments={[attachment]}
                                        reservationId={reservationId}
                                    />
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 rounded-xl border-dashed border-slate-200 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all border-2"
                                        onClick={handleViewPdf}
                                        disabled={isCheckingAttachment}
                                    >
                                        {isCheckingAttachment ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        ) : (
                                            <FileText className="w-4 h-4 text-slate-400" />
                                        )}
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                                            {isCheckingAttachment ? t('common.checking') : t('attachments.view_pdf_doc')}
                                        </span>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                variant={confirmState.variant}
                confirmText={t('common.confirm', 'Confirm')}
                cancelText={t('common.cancel', 'Cancel')}
            >
                {confirmState.title === t('reservations.delete_title', 'Delete Reservation') && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                            {t('reservations.delete_reason_label', 'Reason for deletion (optional)')}
                        </label>
                        <textarea
                            className="w-full min-h-[100px] p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                            placeholder={t('reservations.delete_reason_placeholder', 'Enter reason for deletion...')}
                            value={deleteReason}
                            onChange={(e) => setDeleteReason(e.target.value.slice(0, 200))}
                            maxLength={200}
                        />
                        <div className="text-[10px] text-right text-slate-400">
                            {deleteReason.length} / 200
                        </div>
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
                        } catch (_err) {
                            // Error toast is handled by hook
                        }
                    }}
                    isSubmitting={applyPlan.isPending}
                />
            )}
        </div >
    );
};

const ReservationDetailsSkeleton = () => (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
        </div>
    </div>
);

export default ReservationDetails;
