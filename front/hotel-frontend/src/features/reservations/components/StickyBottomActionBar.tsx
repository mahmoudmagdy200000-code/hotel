import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Info, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CardContent } from '@/components/ui/card';
import { CurrencyCodeLabels } from '@/api/types/reservations';
import type { ReservationFormValues } from '../hooks/useReservationForm';

interface StickyBottomActionBarProps {
    totalAmount: number;
    nights: number;
    isPending: boolean;
}

export const StickyBottomActionBar: React.FC<StickyBottomActionBarProps> = ({
    totalAmount,
    nights,
    isPending
}) => {
    const { t } = useTranslation();
    const { register, watch } = useFormContext<ReservationFormValues>();

    const currencyCode = watch('currencyCode');
    const currencyLabel = CurrencyCodeLabels[currencyCode] || 'USD';

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 md:relative md:bg-slate-900 md:rounded-xl md:shadow-none md:mt-0">
            <CardContent className="p-4 md:p-6 space-y-4">
                <div className="flex items-center justify-between md:hidden">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="paidAtArrivalSticky"
                            {...register('paidAtArrival')}
                            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
                        />
                        <Label htmlFor="paidAtArrivalSticky" className="text-xs font-medium cursor-pointer">
                            {t('reservations.pay_at_arrival', 'Pay at Arrival')}
                        </Label>
                    </div>
                </div>

                <div className="hidden md:block space-y-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="paidAtArrival"
                            {...register('paidAtArrival')}
                            className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500"
                        />
                        <Label htmlFor="paidAtArrival" className="text-sm font-medium cursor-pointer">
                            {t('reservations.pay_at_arrival', 'Pay at Arrival')}
                        </Label>
                    </div>
                    <div className="text-xs text-slate-500 flex items-start gap-2">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{t('reservations.payment_hint', 'Check if the guest will pay upon reaching the hotel.')}</span>
                    </div>
                </div>

                <div className="pt-2 md:pt-4 border-t border-slate-800 flex items-center justify-between md:flex-col md:items-stretch md:gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wider font-bold">
                            {nights} {t('reservations.nights', 'Nights')} • {t('total', 'Total Estimate')}
                        </span>
                        <span className="font-black text-xl md:text-2xl tracking-tight">
                            {currencyLabel} {totalAmount.toFixed(2)}
                        </span>
                    </div>

                    <Button
                        type="submit"
                        className="bg-white text-slate-900 hover:bg-slate-100 h-10 md:h-12 px-6 md:w-full text-sm md:text-md font-black uppercase tracking-tight active:scale-95 transition-all"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2 animate-pulse">
                                {t('saving', 'Saving...')}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Save className="w-4 h-4 md:w-5 md:h-5" />
                                {t('save_reservation', 'Confirm & Check-in')}
                            </span>
                        )}
                    </Button>
                </div>
            </CardContent>
        </div>
    );
};
