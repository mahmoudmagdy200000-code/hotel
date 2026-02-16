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
        const description = `${t('common.are_you_sure', 'Are you sure you want to')} ${type.replace('-', ' ')} ${res.bookingNumber}?`;

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
                            className="w-[180px] border-red-500"
                        />
                    </div>
                </div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('common.error')}</AlertTitle>
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
                    <AlertTitle>{t('common.error')}</AlertTitle>
                    <AlertDescription>
                        {error instanceof Error ? error.message : "Failed to load reception data"}
                    </AlertDescription>
                </Alert>
                <Button onClick={() => refetch()}>{t('common.retry', 'Retry')}</Button>
            </div>
        );
    }

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
                        className="w-[180px]"
                    />
                    <Button variant="outline" size="icon" onClick={() => refetch()} title={t('common.retry')}>
                        <RefreshCw className="h-4 w-4" />
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t('reception.arrivals', 'Arrivals')}
                                </CardTitle>
                                <LogIn className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.summary.arrivalsCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t('reception.departures', 'Departures')}
                                </CardTitle>
                                <LogOut className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.summary.departuresCount}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {t('reception.in_house', 'In House')}
                                </CardTitle>
                                <Home className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.summary.inHouseCount}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="arrivals" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 max-w-[500px]">
                            <TabsTrigger value="arrivals">
                                {t('reception.arrivals', 'Arrivals')}
                                <span className="ms-1 text-xs bg-slate-200 px-1.5 rounded-full text-slate-700">
                                    {data.summary.arrivalsCount}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="departures">
                                {t('reception.departures', 'Departures')}
                                <span className="ms-1 text-xs bg-slate-200 px-1.5 rounded-full text-slate-700">
                                    {data.summary.departuresCount}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="in_house">
                                {t('reception.in_house', 'In House')}
                                <span className="ms-1 text-xs bg-slate-200 px-1.5 rounded-full text-slate-700">
                                    {data.summary.inHouseCount}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="rooms">
                                {t('reception.rooms', 'Rooms')}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="arrivals" className="mt-4">
                            <ReceptionTable
                                data={data.arrivals}
                                emptyMessage={t('reception.no_arrivals', 'No arrivals for this date.')}
                                onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                            />
                        </TabsContent>
                        <TabsContent value="departures" className="mt-4">
                            <ReceptionTable
                                data={data.departures}
                                emptyMessage={t('reception.no_departures', 'No departures for this date.')}
                                onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                            />
                        </TabsContent>
                        <TabsContent value="in_house" className="mt-4">
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
                confirmText={t('common.confirm', 'Confirm')}
                cancelText={t('common.cancel', 'Cancel')}
            />

            <CheckInDialog
                isOpen={checkInState.isOpen}
                onClose={() => setCheckInState(prev => ({ ...prev, isOpen: false }))}
                reservation={checkInState.reservation}
                isPending={actions.checkIn.isPending}
                onConfirm={async (guestName, phone, bookingNumber, checkInDate, checkOutDate, balanceDue, paymentMethod) => {
                    if (!checkInState.reservation) return;
                    try {
                        await actions.checkIn.mutateAsync({
                            id: checkInState.reservation.reservationId,
                            businessDate: selectedDate,
                            guestName,
                            phone,
                            bookingNumber,
                            checkInDate,
                            checkOutDate,
                            balanceDue,
                            paymentMethod
                        });
                        toast.success(t('reception.checkin_success', 'Check-in successful!'));
                        setCheckInState(prev => ({ ...prev, isOpen: false }));
                        refetch();
                    } catch (err: unknown) {
                        toast.error(`Error: ${extractErrorMessage(err)}`);
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
