import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReceptionToday } from '@/features/reception/hooks/useReceptionToday';
import { useReceptionActions } from '@/features/reception/hooks/useReceptionActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';

import { parseISO, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogIn, LogOut, Home } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isValidYYYYMMDD, extractErrorMessage } from '@/lib/utils';
import ReceptionTable from '@/features/reception/components/ReceptionTable';
import RoomsStatusView from '@/features/reception/components/RoomsStatusView';
import CheckInDialog from '@/features/reception/components/CheckInDialog';
import CheckOutDialog from '@/features/reception/components/CheckOutDialog';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';

const ReceptionToday = () => {
    const { t } = useTranslation();
    const { businessDate } = useBusinessDate();
    const [selectedDate, setSelectedDate] = useState<string>(businessDate);

    // Only query if valid
    const isDateValid = isValidYYYYMMDD(selectedDate);
    const { data, isLoading, isError, error, refetch } = useReceptionToday(selectedDate);
    const actions = useReceptionActions();



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

    const [checkInState, setCheckInState] = useState<{
        isOpen: boolean;
        reservation: ReceptionReservationItemDto | null;
    }>({
        isOpen: false,
        reservation: null,
    });

    const [checkOutState, setCheckOutState] = useState<{
        isOpen: boolean;
        reservation: ReceptionReservationItemDto | null;
    }>({
        isOpen: false,
        reservation: null,
    });

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const handleAction = async (type: string, res: ReceptionReservationItemDto) => {
        const title = type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
        const description = `${t('are_you_sure', 'Are you sure you want to')} ${type.replace('-', ' ')} ${res.bookingNumber}?`;

        if (type === 'check-in') {
            setCheckInState({ isOpen: true, reservation: res });
            return;
        }

        if (type === 'check-out') {
            setCheckOutState({ isOpen: true, reservation: res });
            return;
        }

        setConfirmState({
            isOpen: true,
            title,
            description,
            variant: type === 'cancel' ? 'destructive' : 'default',
            onConfirm: async () => {
                closeConfirm();
                try {
                    switch (type) {
                        case 'check-in':
                            // This part will be handled by CheckInDialog now
                            return;
                        case 'check-out':
                            await actions.checkOut.mutateAsync({ id: res.reservationId, businessDate: selectedDate });
                            break;
                        case 'confirm':
                            await actions.confirm.mutateAsync(res.reservationId);
                            break;
                        case 'cancel':
                            await actions.cancel.mutateAsync({ id: res.reservationId });
                            break;
                        case 'no-show':
                            await actions.noShow.mutateAsync({ id: res.reservationId, businessDate: selectedDate });
                            break;
                    }
                    toast.success(`${title} successful!`);
                    refetch();
                } catch (err: unknown) {
                    console.error(`${type} failed`, err);
                    const errorMessage = extractErrorMessage(err);
                    if (errorMessage === 'Cannot create reservation with a past check-in date.') {
                        toast.error(t('errors.past_date', 'الحجز لم يتم لأن تاريخ الوصول في الماضي'));
                    } else {
                        toast.error(`Error: ${errorMessage}`);
                    }
                }
            }
        });
    };

    if (!isDateValid) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        {t('reception.reception_today', 'Reception Today')}
                    </h1>
                    <div className="flex items-center gap-2">
                        <DatePicker
                            date={isDateValid ? parseISO(selectedDate) : undefined}
                            setDate={(d) => setSelectedDate(d ? format(d, 'yyyy-MM-dd') : '')}
                            className="w-[200px] border-red-500"
                        />
                    </div>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('error')}</AlertTitle>
                    <AlertDescription>Invalid date format. Please select a valid date.</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('error')}</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : "Failed to load reception data"}
                    </AlertDescription>
                </Alert>
                <Button onClick={() => refetch()}>{t('retry', 'Retry')}</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header: Core Navigation & Status */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                        {t('reception.reception_today', 'Reception Today')}
                    </h1>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                        {businessDate === selectedDate ? t('today', 'Today') : selectedDate}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DatePicker
                        date={isDateValid ? parseISO(selectedDate) : undefined}
                        setDate={(d) => setSelectedDate(d ? format(d, 'yyyy-MM-dd') : '')}
                        className="w-[200px] h-9 text-xs font-bold border-slate-200"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-slate-100 transition-transform active:scale-95 flex-shrink-0"
                        onClick={() => refetch()}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-[100px] w-full rounded-xl" />
                        <Skeleton className="h-[100px] w-full rounded-xl" />
                        <Skeleton className="h-[100px] w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
            ) : data ? (
                <>
                    {/* Metrics Grid: Professional Horizontal Pulse Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group bg-blue-50/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                <CardTitle className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                    {t('reception.arrivals', 'Arrivals')}
                                </CardTitle>
                                <div className="p-1 sm:p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                    <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none tracking-tight">
                                    {data.summary.arrivalsCount}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group bg-amber-50/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                <CardTitle className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                    {t('reception.departures', 'Departures')}
                                </CardTitle>
                                <div className="p-1 sm:p-1.5 bg-amber-100 rounded-lg text-amber-600">
                                    <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none tracking-tight">
                                    {data.summary.departuresCount}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group bg-emerald-50/20">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                                <CardTitle className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 tracking-wider">
                                    {t('reception.in_house', 'In House')}
                                </CardTitle>
                                <div className="p-1 sm:p-1.5 bg-emerald-100 rounded-lg text-emerald-600">
                                    <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none tracking-tight">
                                    {data.summary.inHouseCount}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="arrivals" className="w-full">
                        {/* Sticky Tabs Navigation */}
                        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md py-3 -mx-4 px-4 sm:relative sm:top-auto sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0 border-b lg:border-none border-slate-100 mb-4">
                            <TabsList className="flex items-center w-full bg-slate-100 p-1 rounded-xl h-auto">
                                <TabsTrigger value="arrivals" className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all">
                                    {t('reception.arrivals')}
                                    <span className="ms-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[9px] font-black">
                                        {data.summary.arrivalsCount}
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger value="departures" className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all">
                                    {t('reception.departures')}
                                    <span className="ms-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[9px] font-black">
                                        {data.summary.departuresCount}
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger value="in_house" className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all">
                                    {t('reception.in_house')}
                                    <span className="ms-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[9px] font-black">
                                        {data.summary.inHouseCount}
                                    </span>
                                </TabsTrigger>
                                <TabsTrigger value="rooms" className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg transition-all">
                                    {t('reception.rooms')}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="arrivals" className="mt-0">
                            <ReceptionTable
                                data={data.arrivals}
                                emptyMessage={t('reception.no_arrivals', 'No arrivals for this date.')}
                                onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                            />
                        </TabsContent>
                        <TabsContent value="departures" className="mt-0">
                            <ReceptionTable
                                data={data.departures}
                                emptyMessage={t('reception.no_departures', 'No departures for this date.')}
                                onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                            />
                        </TabsContent>
                        <TabsContent value="in_house" className="mt-0">
                            <ReceptionTable
                                data={data.inHouse}
                                emptyMessage={t('reception.no_in_house', 'No guests in house.')}
                                onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                            />
                        </TabsContent>
                        <TabsContent value="rooms" className="mt-4">
                            <RoomsStatusView date={selectedDate} />
                        </TabsContent>
                    </Tabs>
                </>
            ) : null}

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

            <CheckInDialog
                isOpen={checkInState.isOpen}
                onClose={() => setCheckInState(prev => ({ ...prev, isOpen: false }))}
                reservation={checkInState.reservation}
                isPending={actions.checkIn.isPending}
                onConfirm={async (guestName, phone, bookingNumber, checkInDate, checkOutDate, totalAmount, balanceDue, paymentMethod, currencyCode) => {
                    if (!checkInState.reservation) return;
                    const doCheckIn = async (force: boolean) => {
                        await actions.checkIn.mutateAsync({
                            id: checkInState.reservation!.reservationId,
                            businessDate: selectedDate,
                            guestName,
                            phone,
                            bookingNumber,
                            checkInDate,
                            checkOutDate,
                            totalAmount,
                            balanceDue,
                            paymentMethod,
                            currencyCode,
                            forceCheckIn: force
                        });
                    };
                    try {
                        await doCheckIn(false);
                        toast.success(t('reception.checkin_success', 'Check-in successful!'));
                        setCheckInState(prev => ({ ...prev, isOpen: false }));
                        refetch();
                    } catch (err: unknown) {
                        const errorMsg = extractErrorMessage(err);
                        if (errorMsg.includes('DATE_MISMATCH')) {
                            // Close CheckInDialog and show date mismatch confirmation
                            setCheckInState(prev => ({ ...prev, isOpen: false }));
                            setConfirmState({
                                isOpen: true,
                                title: t('reception.date_mismatch_title', 'Date Mismatch Warning'),
                                description: t('reception.date_mismatch_desc',
                                    'The check-in date for this reservation does not match today\'s date. Are you sure you want to proceed with the check-in?'),
                                variant: 'destructive',
                                onConfirm: async () => {
                                    closeConfirm();
                                    try {
                                        await doCheckIn(true);
                                        toast.success(t('reception.checkin_success', 'Check-in successful!'));
                                        refetch();
                                    } catch (retryErr: unknown) {
                                        toast.error(`Error: ${extractErrorMessage(retryErr)}`);
                                    }
                                },
                            });
                        } else {
                            toast.error(`Error: ${errorMsg}`);
                        }
                    }
                }}
            />

            <CheckOutDialog
                isOpen={checkOutState.isOpen}
                onClose={() => setCheckOutState(prev => ({ ...prev, isOpen: false }))}
                reservation={checkOutState.reservation}
                isPending={actions.checkOut.isPending}
                onConfirm={async (balanceDue, paymentMethod) => {
                    if (!checkOutState.reservation) return;
                    try {
                        await actions.checkOut.mutateAsync({
                            id: checkOutState.reservation.reservationId,
                            businessDate: selectedDate,
                            balanceDue,
                            paymentMethod
                        });
                        toast.success(t('reception.checkout_success', 'Check-out successful!'));
                        setCheckOutState(prev => ({ ...prev, isOpen: false }));
                        refetch();
                    } catch (err: unknown) {
                        toast.error(`Error: ${extractErrorMessage(err)}`);
                    }
                }}
            />
        </div>
    );
};

export default ReceptionToday;
