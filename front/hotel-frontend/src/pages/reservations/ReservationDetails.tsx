import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReservationDetails } from '@/hooks/reservations/useReservationDetails';
import { useReservationActions } from '@/hooks/reservations/useReservationActions';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    Calendar,
    User,
    Info,
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
    Building2,
    Banknote
} from 'lucide-react';
import { getAttachmentMetadata } from '@/api/attachments';
import { AttachmentList } from '@/components/attachments/AttachmentList';
import { ReservationStatus, ReservationSource, PaymentMethodLabels, CurrencyCodeLabels, CurrencyCodeEnum } from '@/api/types/reservations';
import { cn, formatCurrency, extractErrorMessage } from '@/lib/utils';
import { toast }
    from 'sonner';
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
        } catch (err) {
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
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate(backPath)}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{res.guestName}</h1>
                    <p className="text-sm text-slate-500">#{res.id} • {res.status}</p>
                </div>
                <div className="flex-grow" />
                <div className="flex gap-2">
                    {res.status === ReservationStatus.Draft && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => setIsEditOpen(true)}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 shadow-sm"
                            >
                                <Pencil className="w-4 h-4 me-2" />
                                {t('common.edit', 'Edit')}
                            </Button>
                            <Button
                                className="bg-slate-900"
                                onClick={() => handleConfirmFlow()}
                                disabled={!!(getPlan.isPending || (res.checkInDate && new Date(res.checkInDate) < new Date(new Date().setHours(0, 0, 0, 0))))}
                                title={res.checkInDate && new Date(res.checkInDate) < new Date(new Date().setHours(0, 0, 0, 0))
                                    ? t('errors.past_date', 'الحجز لم يتم لأن تاريخ الوصول في الماضي')
                                    : t('reservations.confirm', 'Confirm')}
                            >
                                {getPlan.isPending ? <Loader2 className="animate-spin w-4 h-4 me-2" /> : <CheckCircle2 className="w-4 h-4 me-2" />}
                                {t('reservations.confirm', 'Confirm')}
                            </Button>
                        </>
                    )}
                    {res.status === ReservationStatus.Confirmed && (
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleAction('check-in', (id) => actions.checkIn.mutateAsync({ id, businessDate }))}
                            disabled={actions.checkIn.isPending || res.checkInDate.split('T')[0] !== businessDate}
                            title={res.checkInDate.split('T')[0] !== businessDate
                                ? t('reservations.check_in_restricted', 'Check-in only allowed on scheduled date')
                                : t('reservations.check_in', 'Check-in')}
                        >
                            <LogIn className="w-4 h-4 me-2" />
                            {t('reservations.check_in', 'Check-in')}
                        </Button>
                    )}
                    {res.status === ReservationStatus.CheckedIn && (
                        <Button
                            variant="secondary"
                            onClick={() => handleAction('check-out', (id) => actions.checkOut.mutateAsync({ id, businessDate }))}
                            disabled={actions.checkOut.isPending || (!isAdmin && res.checkOutDate.split('T')[0] !== businessDate)}
                            title={!isAdmin && res.checkOutDate.split('T')[0] !== businessDate
                                ? t('reservations.check_out_restricted', 'Check-out only allowed on scheduled date')
                                : t('reservations.check_out', 'Check-out') + (isAdmin ? ' (Admin Bypass)' : '')}
                        >
                            <LogOut className="w-4 h-4 me-2" />
                            {t('reservations.check_out', 'Check-out')}
                        </Button>
                    )}
                    {/* State-guarded Actions */}
                    {([ReservationStatus.Draft, ReservationStatus.Confirmed] as ReservationStatus[]).includes(res.status) && (
                        <Button
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleAction('cancel', (id) => actions.cancel.mutateAsync(id))}
                            disabled={actions.cancel.isPending || user?.role === 'Receptionist'}
                            title={user?.role === 'Receptionist'
                                ? t('reservations.cancel_restricted', 'Cancel only allowed for Managers/Admins')
                                : t('reservations.cancel', 'Cancel')}
                        >
                            <XCircle className="w-4 h-4 me-2" />
                            {t('reservations.cancel', 'Cancel')}
                        </Button>
                    )}

                    {res.status === ReservationStatus.Confirmed && (
                        <Button
                            variant="outline"
                            onClick={() => handleAction('no-show', (id) => actions.noShow.mutateAsync({ id, businessDate }))}
                            disabled={actions.noShow.isPending || res.checkInDate.split('T')[0] !== businessDate}
                            title={res.checkInDate.split('T')[0] !== businessDate
                                ? t('reservations.no_show_restricted', 'No-show only allowed on scheduled arrival date')
                                : t('reservations.no_show', 'No-show')}
                        >
                            <UserMinus className="w-4 h-4 me-2" />
                            {t('reservations.no_show', 'No-show')}
                        </Button>
                    )}
                    {/* Delete Button - Admin only, hidden for CheckedOut status */}
                    {isAdmin && res.status !== ReservationStatus.CheckedOut && (
                        <Button
                            variant="ghost"
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={handleDelete}
                            disabled={actions.remove.isPending}
                            title={t('common.delete', 'Delete')}
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                    )}
                </div >
            </div >

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stay Info */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {t('reservations.stay_info', 'Stay Information')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-slate-400">{t('reservations.check_in', 'Check-in')}</div>
                                    <div className="text-lg font-semibold">{res.checkInDate}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">{t('reservations.check_out', 'Check-out')}</div>
                                    <div className="text-lg font-semibold">{res.checkOutDate}</div>
                                </div>
                            </div>
                            {res.hotelName && (
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <div className="text-xs text-slate-400">{t('reservations.hotel_name', 'Hotel')}</div>
                                        <div className="text-sm font-medium">{res.hotelName}</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Rooms */}
                    <Card className="border-none shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                <Bed className="w-4 h-4" />
                                {t('reservations.rooms_and_rates', 'Rooms & Rates')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {res.lines.map((line) => (
                                    <div key={line.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <div className="font-semibold text-slate-900">
                                                {line.roomNumber ? `Room ${line.roomNumber}` : t('reservations.unassigned', 'Unassigned Room')}
                                            </div>
                                            <div className="text-sm text-slate-500">{line.roomTypeName} • {line.nights} {t('common.nights', 'nights')}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium">
                                                {formatCurrency(line.ratePerNight, res.currency)} / night
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                Total: {formatCurrency(line.lineTotal, res.currency)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Guest Section */}
                    <Card className="border-none shadow-sm h-fit">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {t('reservations.guest_details', 'Guest Details')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Info className="w-4 h-4 text-slate-300" />
                                <span className="text-sm font-medium">{res.guestName}</span>
                            </div>
                            {res.phone && (
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-slate-300" />
                                    <span className="text-sm">{res.phone}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment Section - Premium Redesign */}
                    <Card className="border-none shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative h-fit group">
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



                    {/* Attachments Section - Lazy Loaded */}
                    {(res.source === ReservationSource.PDF || res.source === ReservationSource.WhatsApp) && (
                        <Card className="border-none shadow-sm h-fit">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    {t('attachments.title', 'Attachments')}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {attachment ? (
                                    <AttachmentList
                                        attachments={[attachment]}
                                        reservationId={reservationId}
                                    />
                                ) : (
                                    <Button
                                        variant="outline"
                                        className="w-full border-dashed border-2 py-8 h-auto flex flex-col gap-2 group hover:border-slate-300 hover:bg-slate-50 transition-all"
                                        onClick={handleViewPdf}
                                        disabled={isCheckingAttachment}
                                    >
                                        {isCheckingAttachment ? (
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                        ) : (
                                            <FileText className="w-6 h-6 text-slate-300 group-hover:text-slate-400" />
                                        )}
                                        <span className="text-xs font-semibold text-slate-500">
                                            {isCheckingAttachment ? t('common.checking', 'Checking...') : t('attachments.view_pdf_doc', 'Retrieve PDF Document')}
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
                        } catch (err) {
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
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>
        </div>
    </div>
);

export default ReservationDetails;
