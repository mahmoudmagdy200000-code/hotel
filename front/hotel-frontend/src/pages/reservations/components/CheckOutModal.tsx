import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, LogOut, CheckCircle2 } from 'lucide-react';
import type { ReservationDto } from '@/api/types/reservations';
import { PaymentStatusEnum } from '@/api/types/extraCharges';

interface CheckOutModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservation: ReservationDto;
    onConfirm: () => Promise<void>;
    isSubmitting: boolean;
}

export function CheckOutModal({ isOpen, onClose, reservation, onConfirm, isSubmitting }: CheckOutModalProps) {
    const { t } = useTranslation();

    const unpaidCharges = reservation.extraCharges.filter(c => c.paymentStatus !== PaymentStatusEnum.Paid);
    const unpaidChargesTotal = unpaidCharges.reduce((sum, c) => sum + c.amount, 0);
    const hasUnpaidCharges = unpaidChargesTotal > 0;

    // Total Amount Due at check-out
    const totalDue = reservation.balanceDue + unpaidChargesTotal;

    const handleConfirm = async () => {
        if (hasUnpaidCharges) return;
        await onConfirm();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md p-6 bg-white border-slate-100 shadow-2xl rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-slate-900 tracking-tighter uppercase">
                        {t('reservations.check_out_summary', 'Check-out Summary')}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest text-center">
                        Financial Clearing
                    </div>

                    <div className="space-y-3 bg-slate-50 p-5 rounded-[24px] border border-slate-100">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                            <span>Room Balance</span>
                            <span>{formatCurrency(reservation.balanceDue, reservation.currency)}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm font-bold text-slate-700">
                            <span>Unpaid Extra Charges</span>
                            <span className={hasUnpaidCharges ? 'text-amber-500' : ''}>
                                {formatCurrency(unpaidChargesTotal, reservation.currency)}
                            </span>
                        </div>

                        <div className="h-px bg-slate-200 my-2" />

                        <div className="flex justify-between items-center text-lg font-black text-slate-900 tracking-tighter">
                            <span>Total Due</span>
                            <span>{formatCurrency(totalDue, reservation.currency)}</span>
                        </div>
                    </div>

                    {hasUnpaidCharges && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-amber-800 shadow-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-xs font-bold leading-relaxed">
                                <span className="block mb-1 font-black text-sm uppercase tracking-widest text-amber-600">Action Required</span>
                                Guest has {formatCurrency(unpaidChargesTotal, reservation.currency)} in unpaid extra charges. Please settle these charges via the Folio before finalizing check-out.
                            </div>
                        </div>
                    )}

                    {!hasUnpaidCharges && totalDue > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex gap-3 text-emerald-800 shadow-sm">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="text-xs font-bold leading-relaxed">
                                <span className="block mb-1 font-black text-sm uppercase tracking-widest text-emerald-600">Balance Notice</span>
                                Guest has a remaining balance of {formatCurrency(totalDue, reservation.currency)}. The system will automatically clear this balance to 0 upon check-out and record a generic payment. If they are paying with a specific method, please record it manually first.
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            className="rounded-xl px-6 font-bold uppercase tracking-widest text-xs h-12"
                            disabled={isSubmitting}
                        >
                            {t('cancel')}
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isSubmitting || hasUnpaidCharges}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-8 font-black uppercase tracking-widest text-xs h-12 shadow-lg shadow-blue-600/20"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Complete Check-out
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
