import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useReceptionToday } from '@/features/reception/hooks/useReceptionToday';
import { useReceptionActions } from '@/features/reception/hooks/useReceptionActions';
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { parseISO, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogIn, LogOut, Home, ChevronLeft, ChevronRight, Search, LayoutGrid } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isValidYYYYMMDD, extractErrorMessage, cn } from '@/lib/utils';
import ReceptionTable from '@/features/reception/components/ReceptionTable';
import RoomsStatusView from '@/features/reception/components/RoomsStatusView';
import CheckInDialog from '@/features/reception/components/CheckInDialog';
import CheckOutDialog from '@/features/reception/components/CheckOutDialog';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useBusinessDate } from '@/app/providers/BusinessDateProvider';

/**
 * Ras Sedr Rental - Operational Reception Desk
 * Real-time monitoring of arrivals, departures, and in-house guest flow.
 */

const ReceptionToday = () => {
    const { t } = useTranslation();
    const { businessDate } = useBusinessDate();
    const [selectedDate, setSelectedDate] = useState<string>(businessDate);

    const isDateValid = isValidYYYYMMDD(selectedDate);
    const { data, isLoading, refetch, isFetching } = useReceptionToday(selectedDate);
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
                    toast.error(`Error: ${extractErrorMessage(err)}`);
                }
            }
        });
    };

    if (!isDateValid) {
        return (
            <div className="p-4 space-y-4">
                <Alert variant="destructive" className="rounded-3xl border-rose-100 bg-rose-50 p-6">
                    <AlertCircle className="w-5 h-5" />
                    <AlertTitle className="font-black uppercase tracking-widest text-xs ml-2">Invalid Temporal Context</AlertTitle>
                    <AlertDescription className="font-bold text-sm ml-2">The selected date format is invalid for operational queries.</AlertDescription>
                    <Button variant="outline" className="mt-4 border-rose-200" onClick={() => setSelectedDate(businessDate)}>Reset to Business Date</Button>
                </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* STICKY NAVY OPERATIONAL HEADER */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <LayoutGrid className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('reception.reception_today')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        {selectedDate === businessDate ? t('common.today') : format(parseISO(selectedDate), 'EEEE, MMM d')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5 text-slate-400", isFetching && "animate-spin text-emerald-400")} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-inner h-10">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-slate-100"
                                onClick={() => {
                                    const d = parseISO(selectedDate);
                                    d.setDate(d.getDate() - 1);
                                    setSelectedDate(format(d, 'yyyy-MM-dd'));
                                }}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <DatePicker
                                date={parseISO(selectedDate)}
                                setDate={(d) => setSelectedDate(d ? format(d, 'yyyy-MM-dd') : '')}
                                className="h-8 border-none shadow-none font-black text-xs uppercase tracking-tight bg-transparent focus:ring-0 p-0 px-2 min-w-[120px]"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-slate-100"
                                onClick={() => {
                                    const d = parseISO(selectedDate);
                                    d.setDate(d.getDate() + 1);
                                    setSelectedDate(format(d, 'yyyy-MM-dd'));
                                }}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex-1 w-full sm:w-auto h-10 relative group">
                            <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                            <input
                                placeholder="Filter results..."
                                className="w-full h-full bg-white/10 border-white/5 rounded-xl pl-9 text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* PERFORMANCE PULSE GRID */}
            {isLoading ? (
                <div className="grid grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-[32px]" />)}
                </div>
            ) : data ? (
                <div className="grid grid-cols-3 gap-3">
                    <MetricCard
                        title={t('reception.arrivals')}
                        value={data.summary.arrivalsCount}
                        icon={<LogIn className="w-4 h-4 text-blue-600" />}
                        bg="bg-blue-100"
                        accent="bg-blue-600"
                    />
                    <MetricCard
                        title={t('reception.departures')}
                        value={data.summary.departuresCount}
                        icon={<LogOut className="w-4 h-4 text-amber-600" />}
                        bg="bg-amber-100"
                        accent="bg-amber-600"
                    />
                    <MetricCard
                        title={t('reception.in_house')}
                        value={data.summary.inHouseCount}
                        icon={<Home className="w-4 h-4 text-emerald-600" />}
                        bg="bg-emerald-100"
                        accent="bg-emerald-600"
                    />
                </div>
            ) : null}

            {/* OPERATIONAL TABS */}
            <Tabs defaultValue="arrivals" className="w-full">
                <div className="sticky top-[164px] sm:top-0 z-30 -mx-4 sm:mx-0 px-4 py-2 sm:p-0 bg-slate-50/95 backdrop-blur-sm sm:bg-transparent">
                    <TabsList className="w-full bg-white rounded-2xl p-1 border border-slate-100 shadow-sm h-12">
                        <TabsTrigger value="arrivals" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-full">
                            {t('reception.arrivals')}
                            {data && <span className="ml-2 py-0.5 px-1.5 bg-blue-500 text-white rounded-md text-[8px]">{data.summary.arrivalsCount}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="departures" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-full">
                            {t('reception.departures')}
                            {data && <span className="ml-2 py-0.5 px-1.5 bg-amber-500 text-white rounded-md text-[8px]">{data.summary.departuresCount}</span>}
                        </TabsTrigger>
                        <TabsTrigger value="in_house" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-full">
                            {t('reception.in_house')}
                        </TabsTrigger>
                        <TabsTrigger value="rooms" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-full">
                            {t('reception.rooms')}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="mt-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-3xl" />)}
                        </div>
                    ) : (
                        <>
                            <TabsContent value="arrivals" className="mt-0 focus-visible:outline-none">
                                <ReceptionTable
                                    data={data?.arrivals || []}
                                    emptyMessage={t('reception.no_arrivals')}
                                    onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                                />
                            </TabsContent>
                            <TabsContent value="departures" className="mt-0 focus-visible:outline-none">
                                <ReceptionTable
                                    data={data?.departures || []}
                                    emptyMessage={t('reception.no_departures')}
                                    onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                                />
                            </TabsContent>
                            <TabsContent value="in_house" className="mt-0 focus-visible:outline-none">
                                <ReceptionTable
                                    data={data?.inHouse || []}
                                    emptyMessage={t('reception.no_in_house')}
                                    onAction={(type, res) => handleAction(type as string, res as ReceptionReservationItemDto)}
                                />
                            </TabsContent>
                            <TabsContent value="rooms" className="mt-0 focus-visible:outline-none">
                                <RoomsStatusView date={selectedDate} />
                            </TabsContent>
                        </>
                    )}
                </div>
            </Tabs>

            {/* MODALS */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                description={confirmState.description}
                onConfirm={confirmState.onConfirm}
                onCancel={closeConfirm}
                variant={confirmState.variant}
                confirmText={t('common.confirm')}
                cancelText={t('common.cancel')}
            />

            <CheckInDialog
                isOpen={checkInState.isOpen}
                onClose={() => setCheckInState(prev => ({ ...prev, isOpen: false }))}
                reservation={checkInState.reservation}
                isPending={actions.checkIn.isPending}
                onConfirm={async (guestName, phone, bookingNumber, checkInDate, checkOutDate, balanceDue, paymentMethod, currencyCode) => {
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
                            paymentMethod,
                            currencyCode
                        });
                        toast.success(t('reception.checkin_success'));
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
                        toast.success(t('reception.checkout_success'));
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

const MetricCard = ({ title, value, icon, bg, accent }: { title: string, value: number, icon: React.ReactNode, bg: string, accent: string }) => (
    <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group rounded-[32px] overflow-hidden bg-white">
        <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <div className={cn("p-1.5 rounded-xl transition-all shadow-sm", bg)}>{icon}</div>
            </div>
            <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tighter">{value}</h3>
                <div className={cn("w-1 h-1 rounded-full animate-pulse", accent)} />
            </div>
        </CardContent>
    </Card>
);

export default ReceptionToday;
