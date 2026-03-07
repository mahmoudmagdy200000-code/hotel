import React from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Banknote, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CurrencyCodeEnum, PaymentMethodEnum } from '@/api/types/reservations';
import type { ReservationFormValues } from '../hooks/useReservationForm';
import type { CurrencyCodeValue } from '@/api/types/reservations';

export const FinancialDetailsSection: React.FC = () => {
    const { t } = useTranslation();
    const { register, watch, setValue } = useFormContext<ReservationFormValues>();

    const currencyCode = watch('currencyCode');

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                    <Banknote className="w-4 h-4" />
                    {t('reservations.financial_info', 'Financial Details')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>{t('reservations.currency', 'Currency')}</Label>
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                        value={currencyCode}
                        onChange={(e) => setValue('currencyCode', Number(e.target.value) as CurrencyCodeValue)}
                    >
                        <option value={CurrencyCodeEnum.EGP}>EGP - جنيه مصري</option>
                        <option value={CurrencyCodeEnum.USD}>USD - دولار</option>
                        <option value={CurrencyCodeEnum.EUR}>EUR - يورو</option>
                        <option value={CurrencyCodeEnum.Other}>{t('other', 'Other')}</option>
                    </select>
                </div>

                {currencyCode === CurrencyCodeEnum.Other && (
                    <div className="space-y-2">
                        <Label>{t('reservations.currency_other', 'Currency Name')}</Label>
                        <Input
                            {...register('currencyOther', { maxLength: 12 })}
                            placeholder="e.g. GBP, SAR"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <Label>{t('reservations.payment_method', 'Payment Method')}</Label>
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                        {...register('paymentMethod', { valueAsNumber: true })}
                    >
                        <option value={PaymentMethodEnum.Cash}>{t('reservations.cash', 'Cash')}</option>
                        <option value={PaymentMethodEnum.Visa}>{t('reservations.visa', 'Visa')}</option>
                        <option value={PaymentMethodEnum.Other}>{t('other', 'Other')}</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="balanceDue">{t('reservations.balance_due', 'Balance Due')}</Label>
                    <Input
                        id="balanceDue"
                        type="number"
                        min={0}
                        step="0.01"
                        {...register('balanceDue', { valueAsNumber: true })}
                        placeholder="0.00"
                    />
                    <p className="text-xs text-slate-400 flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {t('reservations.balance_due_hint', 'Remaining unpaid amount')}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};
