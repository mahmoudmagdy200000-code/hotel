import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatHotelTime } from '@/utils/date';
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
    AlertCircle,
    Utensils,
    Users,
    ShoppingBag
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
import { CheckOutModal } from '@/pages/reservations/components/CheckOutModal';
import { PaymentStatusEnum, PaymentStatusLabels } from '@/api/types/extraCharges';
import { useExtraChargeMutations } from '@/hooks/reservations/useExtraChargeMutations';
import { useGetConfirmationPlan, useApplyConfirmationPlan } from '@/features/reception/hooks/useBulkConfirmation';
import { AllocationReviewModal } from '@/pages/reception/components/AllocationReviewModal';
import type { ReservationAllocationPlanDto } from '@/api/types/reception';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';
import CheckInDialog from '@/features/reception/components/CheckInDialog';
import { useReceptionActions } from '@/features/reception/hooks/useReceptionActions';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import ExtraChargesModal from '@/components/reservation/ExtraChargesModal';
import { ExtraChargeDetailsModal } from './components/ExtraChargeDetailsModal';
import type { ExtraChargeDto } from '@/api/types/extraCharges';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog';


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
    const [isExtraChargesOpen, setIsExtraChargesOpen] = useState(false);
    const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
    const [viewChargeDetails, setViewChargeDetails] = useState<ExtraChargeDto | null>(null);
    const [deleteChargeId, setDeleteChargeId] = useState<number | null>(null);
    const extraChargeMutations = useExtraChargeMutations(reservationId);
    const getPlan = useGetConfirmationPlan();
    const applyPlan = useApplyConfirmationPlan();
    const [allocationPlan, setAllocationPlan] = useState<ReservationAllocationPlanDto | null>(null);
    const [isAllocationOpen, setIsAllocationOpen] = useState(false);

    const receptionActions = useReceptionActions();
    const [checkInState, setCheckInState] = useState<{
        isOpen: boolean;
        reservation: ReceptionReservationItemDto | null;
    }>({
        isOpen: false,
        reservation: null,
    });

    const mapToReceptionDto = (reservationData: any): ReceptionReservationItemDto => ({
        reservationId: reservationData.id,
        bookingNumber: reservationData.bookingNumber || '',
        guestName: reservationData.guestName,
        phone: reservationData.phone,
        checkIn: reservationData.checkInDate,
        checkOut: reservationData.checkOutDate,
        status: reservationData.status.toString(),
        roomNumbers: reservationData.lines.map((l: any) => l.roomNumber),
        roomTypeNames: reservationData.lines.map((l: any) => l.roomTypeName),
        totalAmount: reservationData.totalAmount,
        balanceDue: reservationData.balanceDue,
        currency: reservationData.currency,
        currencyCode: reservationData.currencyCode,
        paymentMethod: reservationData.paymentMethod === 1 ? 'Cash' : reservationData.paymentMethod === 2 ? 'Card' : 'Other',
        source: reservationData.source ?? 1, // ReservationSource enum int; default to Manual(1) if missing
        isPriceLocked: reservationData.isPriceLocked ?? ((reservationData.source ?? 1) !== 1),
        actualCheckOut: reservationData.actualCheckOutDate,
        isEarlyCheckOut: reservationData.status === ReservationStatus.CheckedOut &&
            reservationData.actualCheckOutDate &&
            new Date(reservationData.actualCheckOutDate) < new Date(reservationData.checkOutDate),
        lines: reservationData.lines.map((l: any) => ({
            id: l.id,
            roomId: l.roomId,
            roomNumber: l.roomNumber || '',
            roomTypeId: l.roomTypeId,
            roomTypeName: l.roomTypeName,
        }))
    });

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
            variant: type === 'cancel' || type === 'delete-charge' ? 'destructive' : 'default',
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
                            {res.actualCheckOutDate && res.actualCheckOutDate < res.checkOutDate && (
                                <Badge className="bg-orange-500 text-white border-none px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                    {t('reservations.left_early', 'Left Early')}
                                </Badge>
                            )}
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

                {isAdmin && (
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
                                    className="flex-1 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wide transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={user?.role === 'Receptionist'}
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
                                    onClick={() => setCheckInState({ isOpen: true, reservation: mapToReceptionDto(res) })}
                                    disabled={receptionActions.checkIn.isPending}
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
                            <>
                                <Button
                                    className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wide shadow-lg shadow-blue-600/30 transition-all active:scale-[0.97]"
                                    onClick={() => setIsCheckOutOpen(true)}
                                    disabled={actions.checkOut.isPending}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    {t('reservations.check_out')}
                                </Button>
                                {/* Extra Charges trigger — only on active stays */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="flex-none h-12 w-12 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 hover:text-amber-300 transition-all active:scale-[0.97]"
                                    title="Extra Charges"
                                    onClick={() => setIsExtraChargesOpen(true)}
                                >
                                    <ShoppingBag className="w-5 h-5" />
                                </Button>
                            </>
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
                            <div className="flex items-center gap-2">
                                {res.mealPlan && (
                                    <div className="text-[10px] font-black text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg uppercase tracking-tighter flex items-center gap-1.5 border border-sky-100 shadow-sm">
                                        <Utensils className="w-3 h-3" />
                                        {res.mealPlan}
                                    </div>
                                )}
                                {res.numberOfPersons && res.numberOfPersons > 0 && (
                                    <div className="text-[10px] font-black text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg uppercase tracking-tighter flex items-center gap-1.5 border border-violet-100 shadow-sm">
                                        <Users className="w-3 h-3" />
                                        {res.numberOfPersons} {res.numberOfPersons === 1 ? 'Guest' : 'Guests'}
                                    </div>
                                )}
                                <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-tighter shadow-sm">
                                    {res.lines[0]?.nights || 0} Night Duration
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="flex items-center justify-between bg-slate-50 rounded-[28px] p-6 border border-slate-100 relative shadow-inner">
                                <div className="flex-1 text-center group">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('reservations.check_in')}</span>
                                    <div className="text-xl font-black text-slate-900 tracking-tighter">
                                        {formatHotelTime(res.checkInDate, 'MMM d, yyyy')}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-1">
                                        {formatHotelTime(res.checkInDate, 'EEEE')}
                                        <span className="ml-2 text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-black">14:00+ EGY</span>
                                    </span>
                                </div>
                                <div className="p-4 bg-white rounded-full shadow-lg border border-slate-100 z-10 scale-110">
                                    <ChevronRight className="w-6 h-6 text-slate-900" />
                                </div>
                                <div className="flex-1 text-center group">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{t('reservations.check_out')}</span>
                                    <div className={cn(
                                        "text-xl font-black tracking-tighter",
                                        res.actualCheckOutDate && res.actualCheckOutDate < res.checkOutDate ? "text-orange-500" : "text-slate-900"
                                    )}>
                                        {formatHotelTime(res.actualCheckOutDate && res.actualCheckOutDate < res.checkOutDate ? res.actualCheckOutDate : res.checkOutDate, 'MMM d, yyyy')}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-1">
                                        {formatHotelTime(res.actualCheckOutDate && res.actualCheckOutDate < res.checkOutDate ? res.actualCheckOutDate : res.checkOutDate, 'EEEE')}
                                        {res.actualCheckOutDate && res.actualCheckOutDate < res.checkOutDate ? (
                                            <span className="ml-2 text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-black">EARLY DEPARTURE</span>
                                        ) : (
                                            <span className="ml-2 text-[9px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md font-black">{'<'} 10:00 EGY</span>
                                        )}
                                    </span>
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
                                                {line.nights > 0 && (
                                                    <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md text-[8px] font-black">
                                                        {line.nights} {line.nights === 1 ? 'NIGHT' : 'NIGHTS'}
                                                    </span>
                                                )}
                                                {res.isEarlyCheckOut && (
                                                    <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md text-[8px] font-black flex items-center gap-1 shadow-sm">
                                                        <LogOut className="w-2.5 h-2.5" />
                                                        EARLY DEPARTURE
                                                    </span>
                                                )}
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

                    {/* FOLIO & EXTRA CHARGES */}
                    <Card className="border-none shadow-sm rounded-[32px] bg-white overflow-hidden">
                        <CardHeader className="p-6 pb-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 rounded-xl"><FileText className="w-4 h-4 text-blue-600" /></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Folio & Extra Charges</span>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {res.extraCharges && res.extraCharges.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="rounded-[24px] border border-slate-100 overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-5 py-4 w-28">Date</th>
                                                    <th className="px-5 py-4">Description</th>
                                                    <th className="px-5 py-4">Method</th>
                                                    <th className="px-5 py-4 text-right">Amount</th>
                                                    <th className="px-5 py-4 w-24">Status</th>
                                                    <th className="px-5 py-4 w-12 border-l border-slate-100 sticky right-0 bg-slate-50/95 backdrop-blur-sm z-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {res.extraCharges.map((ec) => (
                                                    <tr key={ec.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-5 py-4 tracking-tight text-slate-700 whitespace-nowrap">
                                                            {formatHotelTime(ec.date, 'MMM d, HH:mm')}
                                                        </td>
                                                        <td className="px-5 py-4 text-slate-900 font-black tracking-tighter">
                                                            {ec.description}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {PaymentMethodLabels[ec.paymentMethod]}
                                                        </td>
                                                        <td className="px-5 py-4 text-right font-black text-slate-900 tracking-tighter text-sm">
                                                            {formatCurrency(ec.amount, res.currency)}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <Badge className={cn(
                                                                "px-2 py-0.5 rounded-lg text-[8px] border-none shadow-sm",
                                                                ec.paymentStatus === PaymentStatusEnum.Paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                                            )}>
                                                                {PaymentStatusLabels[ec.paymentStatus]}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-3 py-4 text-center border-l border-slate-50 sticky right-0 bg-white/95 backdrop-blur-sm z-10 group-hover:bg-slate-50/95 transition-colors">
                                                            <div className="flex items-center justify-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                                                                    onClick={() => setViewChargeDetails(ec)}
                                                                >
                                                                    <FileText className="w-3.5 h-3.5" />
                                                                </Button>
                                                                {ec.paymentStatus === PaymentStatusEnum.Pending && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                                                                        onClick={() => setDeleteChargeId(ec.id)}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    No extra charges recorded
                                </div>
                            )}
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
                <CheckInDialog
                    isOpen={checkInState.isOpen}
                    onClose={() => setCheckInState(prev => ({ ...prev, isOpen: false }))}
                    reservation={checkInState.reservation}
                    isPending={receptionActions.checkIn.isPending}
                    businessDate={businessDate}
                    onConfirm={async (guestName, phone, bookingNumber, checkInDate, checkOutDate, totalAmount, balanceDue, paymentMethod, currencyCode, roomAssignments) => {
                        if (!checkInState.reservation) return;
                        try {
                            await receptionActions.checkIn.mutateAsync({
                                id: checkInState.reservation.reservationId,
                                businessDate: businessDate,
                                guestName,
                                phone,
                                bookingNumber,
                                checkInDate,
                                checkOutDate,
                                totalAmount,
                                balanceDue,
                                paymentMethod,
                                currencyCode,
                                roomAssignments
                            });
                            toast.success(t('reception.checkin_success', 'Check-in successful!'));
                            setCheckInState(prev => ({ ...prev, isOpen: false }));
                            refetch();
                        } catch (err: unknown) {
                            const errorMsg = extractErrorMessage(err);
                            if (errorMsg.includes('DATE_MISMATCH')) {
                                toast.error(t('reception.date_mismatch_desc', 'Check-in date must be today, yesterday, or tomorrow relative to the business date. Please update the check-in date before proceeding.'), {
                                    duration: 6000,
                                });
                            } else {
                                toast.error(`Error: ${errorMsg}`);
                            }
                        }
                    }}
                />
            )}

            {res && (
                <EditReservationDialog
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    reservation={res}
                    onSubmit={async (id, cmd) => {
                        try {
                            await actions.update.mutateAsync({ id, command: cmd });
                            setIsEditOpen(false);
                            toast.success(t('reservations.update_success', 'Reservation updated successfully'));
                            refetch();
                        } catch (err: unknown) {
                            toast.error(extractErrorMessage(err));
                            throw err;
                        }
                    }}
                    isSubmitting={actions.update.isPending}
                    isPriceLocked={res.isPriceLocked ?? (res.source !== ReservationSource.Manual)}
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

            {/* EXTRA CHARGES MODAL */}
            <ExtraChargesModal
                isOpen={isExtraChargesOpen}
                onClose={() => setIsExtraChargesOpen(false)}
                reservationId={reservationId}
                currencyCode={res?.currencyCode}
                guestName={res?.guestName}
            />

            {res && (
                <CheckOutModal
                    isOpen={isCheckOutOpen}
                    onClose={() => setIsCheckOutOpen(false)}
                    reservation={res}
                    isSubmitting={actions.checkOut.isPending}
                    onConfirm={async () => {
                        try {
                            await actions.checkOut.mutateAsync({ id: reservationId, businessDate });
                            setIsCheckOutOpen(false);
                            toast.success(t('reservations.checkout_success', 'Checked out successfully!'));
                            refetch();
                        } catch (err: unknown) {
                            toast.error(extractErrorMessage(err));
                        }
                    }}
                />
            )}

            {/* Extra Charge Details Modal */}
            {res && (
                <ExtraChargeDetailsModal
                    isOpen={!!viewChargeDetails}
                    onClose={() => setViewChargeDetails(null)}
                    charge={viewChargeDetails}
                    currency={res.currencyCode}
                    reservationId={reservationId}
                />
            )}

            {/* Delete Extra Charge Confirmation Dialog */}
            <AlertDialog open={!!deleteChargeId} onOpenChange={(open: boolean) => !open && setDeleteChargeId(null)}>
                <AlertDialogContent className="rounded-3xl border-slate-100 shadow-2xl overflow-hidden p-0 max-w-sm">
                    <div className="p-8 text-center bg-white space-y-6">
                        <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-50/50">
                            <Trash2 className="w-8 h-8 text-rose-500" />
                        </div>
                        <div className="space-y-2">
                            <AlertDialogTitle className="text-2xl font-black text-slate-900 tracking-tighter">
                                Delete Extra Charge?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-sm font-bold text-slate-500 max-w-[260px] mx-auto">
                                This action cannot be undone. The charge will be permanently removed from this folio.
                            </AlertDialogDescription>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <AlertDialogCancel className="h-12 flex-1 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 border-slate-200 hover:bg-slate-50 transition-colors">
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="h-12 flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200 transition-all"
                                onClick={() => {
                                    if (deleteChargeId) {
                                        handleAction('delete-charge', () => extraChargeMutations.removeCharge.mutateAsync(deleteChargeId));
                                        setDeleteChargeId(null);
                                    }
                                }}
                            >
                                Delete
                            </AlertDialogAction>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
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
