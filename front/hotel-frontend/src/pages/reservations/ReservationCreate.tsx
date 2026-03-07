import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FormProvider } from 'react-hook-form';
import { useReservationActions } from '@/hooks/reservations/useReservationActions';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { extractErrorMessage } from '@/lib/utils';
import type { CreateReservationCommand } from '@/api/types/reservations';
import { CurrencyCodeEnum } from '@/api/types/reservations';

// New Features/Components
import { useReservationForm } from '@/features/reservations/hooks/useReservationForm';
import { StayInformationSection } from '@/features/reservations/components/StayInformationSection';
import { GuestInformationSection } from '@/features/reservations/components/GuestInformationSection';
import { FinancialDetailsSection } from '@/features/reservations/components/FinancialDetailsSection';
import { StickyBottomActionBar } from '@/features/reservations/components/StickyBottomActionBar';

const ReservationCreate = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { create } = useReservationActions();

    const {
        form,
        nights,
        totalAmount
    } = useReservationForm('Walk-in');

    const handleSubmit = async (values: any) => {
        // Line validation
        if (values.lines.some((l: any) => l.roomId === 0)) {
            toast.error(t('reservations.select_room_error', 'Please select a room for all lines.'));
            return;
        }

        // CurrencyOther validation
        if (values.currencyCode === CurrencyCodeEnum.Other && !values.currencyOther?.trim()) {
            toast.error(t('reservations.currency_other_required', 'Please specify the currency name.'));
            return;
        }

        try {
            const command: CreateReservationCommand = {
                guestName: values.guestName,
                phone: values.phone,
                checkInDate: new Date(values.checkInDate).toISOString(),
                checkOutDate: new Date(values.checkOutDate).toISOString(),
                hotelName: values.hotelName || 'Walk-in',
                balanceDue: Number(values.balanceDue) || 0,
                paidAtArrival: values.paidAtArrival,
                currencyCode: values.currencyCode,
                currencyOther: values.currencyCode === CurrencyCodeEnum.Other ? values.currencyOther : null,
                paymentMethod: values.paymentMethod,
                lines: values.lines.map((l: any) => ({
                    roomId: l.roomId,
                    ratePerNight: l.ratePerNight
                }))
            };

            const result = await create.mutateAsync(command);
            toast.success(t('reservations.create_success', 'Reservation created successfully!'));
            navigate(`/reservations/${result.id}`);
        } catch (err: unknown) {
            const errorMessage = extractErrorMessage(err);
            if (errorMessage === 'Cannot create reservation with a past check-in date.') {
                toast.error(t('errors.past_date', 'الحجز لم يتم لأن تاريخ الوصول في الماضي'));
            } else {
                toast.error(errorMessage);
            }
        }
    };

    return (
        <FormProvider {...form}>
            <div className="max-w-4xl mx-auto pb-32 md:pb-8 space-y-6 px-4 sm:px-0">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate('/reservations')}
                        className="h-10 w-10 rounded-full border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <div className="space-y-0.5">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            {t('reservations.create_new', 'New Reservation')}
                        </h1>
                        <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {t('reservations.occupancy_first', 'Availability & Stay Details First')}
                        </div>
                    </div>
                </div>

                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Interaction Area */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* 1. Stay & Room Selection (PRIORITY 1) */}
                            <StayInformationSection />

                            {/* 2. Guest Information (PRIORITY 2) */}
                            <GuestInformationSection />
                        </div>

                        {/* Sidebar / Secondary Info */}
                        <div className="space-y-6">
                            {/* 3. Financials (PRIORITY 3) */}
                            <FinancialDetailsSection />

                            {/* Payment Summary - Only visible on Desktop, Sticky Bar handles mobile */}
                            <div className="hidden md:block">
                                <StickyBottomActionBar
                                    totalAmount={totalAmount}
                                    nights={nights}
                                    isPending={create.isPending}
                                />
                            </div>
                        </div>
                    </div>
                </form>

                {/* Mobile Sticky Bar */}
                <div className="md:hidden">
                    <FormProvider {...form}>
                        <StickyBottomActionBar
                            totalAmount={totalAmount}
                            nights={nights}
                            isPending={create.isPending}
                        />
                    </FormProvider>
                </div>
            </div>
        </FormProvider>
    );
};

export default ReservationCreate;
