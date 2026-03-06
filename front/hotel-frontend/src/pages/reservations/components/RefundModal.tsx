import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, Undo2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PaymentMethodEnum, type PaymentMethodValue } from '@/api/types/reservations';

interface RefundModalProps {
    isOpen: boolean;
    onClose: () => void;
    maxRefundable: number;
    currency: string;
    currencyCode: number;
    reservationId: number;
    isSubmitting: boolean;
    onConfirm: (refundAmount: number, paymentMethod: PaymentMethodValue, reason: string) => Promise<void>;
}

const PAYMENT_METHODS: { value: PaymentMethodValue; label: string }[] = [
    { value: PaymentMethodEnum.Cash, label: 'Cash' },
    { value: PaymentMethodEnum.Visa, label: 'Visa' },
    { value: PaymentMethodEnum.Other, label: 'Other' },
];

export const RefundModal: React.FC<RefundModalProps> = ({
    isOpen,
    onClose,
    maxRefundable,
    currency,
    reservationId,
    isSubmitting,
    onConfirm,
}) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(PaymentMethodEnum.Cash);

    const parsedAmount = parseFloat(amount) || 0;
    const isOverLimit = parsedAmount > maxRefundable;
    const isValidAmount = parsedAmount > 0 && !isOverLimit;

    const handleSubmit = async () => {
        if (!isValidAmount) return;
        await onConfirm(parsedAmount, paymentMethod, reason);
        // Reset form state after success
        setAmount('');
        setReason('');
        setPaymentMethod(PaymentMethodEnum.Cash);
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setAmount('');
        setReason('');
        setPaymentMethod(PaymentMethodEnum.Cash);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="max-w-md rounded-3xl border-slate-100 shadow-2xl overflow-hidden p-0">
                <div className="p-8 bg-white space-y-6">
                    {/* Header */}
                    <DialogHeader className="space-y-3">
                        <div className="mx-auto w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center ring-8 ring-amber-50/50">
                            <Undo2 className="w-8 h-8 text-amber-600" />
                        </div>
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter text-center">
                            {t('reservations.process_refund', 'Process Refund')}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-bold text-slate-500 text-center max-w-[280px] mx-auto">
                            {t('reservations.refund_desc', 'Issue a folio adjustment for reservation')} #{reservationId}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Max Refundable Info */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Refundable</span>
                        <span className="text-lg font-black text-slate-900 tracking-tighter">
                            {formatCurrency(maxRefundable, currency)}
                        </span>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {t('reservations.refund_amount', 'Refund Amount')}
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={maxRefundable}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className={`h-14 rounded-2xl text-lg font-black text-center tracking-tighter border-2 transition-colors ${isOverLimit
                                    ? 'border-rose-300 bg-rose-50 text-rose-600 focus:ring-rose-200'
                                    : 'border-slate-100 bg-slate-50 focus:border-blue-300 focus:ring-blue-200'
                                }`}
                            disabled={isSubmitting}
                        />
                        {isOverLimit && (
                            <div className="flex items-center gap-1.5 text-rose-500 text-[10px] font-black uppercase tracking-widest">
                                <AlertTriangle className="w-3 h-3" />
                                Exceeds maximum refundable amount
                            </div>
                        )}
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Refund Method
                        </label>
                        <div className="flex gap-2">
                            {PAYMENT_METHODS.map(({ value, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setPaymentMethod(value)}
                                    className={`flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${paymentMethod === value
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-300'
                                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-600'
                                        }`}
                                    disabled={isSubmitting}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Reason Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {t('reservations.refund_reason', 'Reason (Optional)')}
                        </label>
                        <textarea
                            className="w-full min-h-[80px] p-4 text-xs font-bold bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all shadow-inner resize-none"
                            placeholder="e.g. Early checkout — refund for unused nights"
                            value={reason}
                            onChange={(e) => setReason(e.target.value.slice(0, 200))}
                            maxLength={200}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="outline"
                            className="h-12 flex-1 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 border-slate-200 hover:bg-slate-50 transition-colors"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            className="h-12 flex-1 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSubmit}
                            disabled={!isValidAmount || isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Undo2 className="w-4 h-4 mr-2" />
                            )}
                            {isSubmitting ? 'Processing...' : `Refund ${parsedAmount > 0 ? formatCurrency(parsedAmount, currency) : ''}`}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
