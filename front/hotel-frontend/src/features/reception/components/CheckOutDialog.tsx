import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PaymentMethodEnum } from '@/api/types/reservations';
import type { PaymentMethodValue } from '@/api/types/reservations';
import type { ReceptionReservationItemDto } from '@/api/types/reception';
import { Wallet, CreditCard, MoreHorizontal, Banknote, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckOutDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (balanceDue: number, paymentMethod: PaymentMethodValue) => void;
    reservation: ReceptionReservationItemDto | null;
    isPending: boolean;
}

const CheckOutDialog: React.FC<CheckOutDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    reservation,
    isPending
}) => {
    const { t } = useTranslation();
    const [balanceDue, setBalanceDue] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(PaymentMethodEnum.Cash);
    const [confirmPayment, setConfirmPayment] = useState<boolean>(false);

    useEffect(() => {
        if (reservation) {
            setBalanceDue(reservation.balanceDue);
            setConfirmPayment(false); // Reset confirmation

            // Map string from DTO to enum value
            const method = reservation.paymentMethod as keyof typeof PaymentMethodEnum;
            if (PaymentMethodEnum[method]) {
                setPaymentMethod(PaymentMethodEnum[method]);
            } else {
                setPaymentMethod(PaymentMethodEnum.Cash);
            }
        }
    }, [reservation, isOpen]);

    const handleConfirm = () => {
        // If they confirmed payment, we send 0 for balanceDue
        const finalBalance = confirmPayment ? 0 : balanceDue;
        onConfirm(finalBalance, paymentMethod);
    };

    if (!reservation) return null;

    const hasBalance = reservation.balanceDue > 0;

    const paymentMethods = [
        { value: PaymentMethodEnum.Cash, label: t('reservations.cash', 'Cash'), icon: Banknote },
        { value: PaymentMethodEnum.Visa, label: t('reservations.visa', 'Visa'), icon: CreditCard },
        { value: PaymentMethodEnum.Other, label: t('reservations.other', 'Other'), icon: MoreHorizontal },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-hidden border-none shadow-2xl p-0">
                <div className={cn("p-6 text-white", hasBalance ? "bg-amber-600" : "bg-slate-900")}>
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            {hasBalance ? (
                                <AlertTriangle className="h-5 w-5 text-amber-100" />
                            ) : (
                                <Wallet className="h-5 w-5 text-emerald-400" />
                            )}
                            {t('reception.check_out_title', 'Complete Check-Out')}
                        </DialogTitle>
                        <DialogDescription className="text-slate-100/70">
                            {t('reception.check_out_description', 'Finalize stay for {{guest}}.', { guest: reservation.guestName })}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6 bg-white">
                    {hasBalance && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-amber-900 leading-none">
                                    {t('reception.unpaid_balance', 'Unpaid Balance Detected')}
                                </p>
                                <p className="text-xs text-amber-700">
                                    {t('reception.balance_msg', 'Guest still owes {{amount}} {{currency}}.', {
                                        amount: reservation.balanceDue,
                                        currency: reservation.currency || 'EGP'
                                    })}
                                </p>
                            </div>
                        </div>
                    )}

                    {hasBalance && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="confirmPayment"
                                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                    checked={confirmPayment}
                                    onChange={(e) => setConfirmPayment(e.target.checked)}
                                />
                                <Label htmlFor="confirmPayment" className="text-sm font-bold text-slate-800 cursor-pointer">
                                    {t('reception.confirm_paid', 'I confirm the balance has been paid in full.')}
                                </Label>
                            </div>

                            {confirmPayment && (
                                <div className="space-y-3 pt-2">
                                    <Label className="text-sm font-semibold text-slate-700">
                                        {t('reservations.payment_method', 'Payment Method for final settlement')}
                                    </Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {paymentMethods.map((method) => {
                                            const Icon = method.icon;
                                            const isActive = paymentMethod === method.value;
                                            return (
                                                <button
                                                    key={method.value}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(method.value)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-sm font-medium text-left",
                                                        isActive
                                                            ? "border-slate-900 bg-slate-50 text-slate-900 shadow-sm"
                                                            : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "p-2 rounded-lg transition-colors",
                                                            isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"
                                                        )}>
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        {method.label}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!hasBalance && (
                        <div className="text-center py-4">
                            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                                <Wallet className="h-6 w-6 text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                                {t('reception.no_balance_checkout', 'Balance is cleared. Ready for check-out.')}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 pt-0 bg-white">
                    <div className="flex gap-3 w-full">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isPending || (hasBalance && !confirmPayment)}
                            className={cn(
                                "flex-1 h-11 rounded-xl shadow-lg active:scale-95 transition-all",
                                hasBalance && !confirmPayment ? "bg-slate-200" : "bg-slate-900 hover:bg-slate-800 text-white"
                            )}
                        >
                            {isPending ? t('common.loading', 'Loading...') : t('reception.checkout', 'Check Out')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CheckOutDialog;
