import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type {
    ExtraChargeDto
} from '@/api/types/extraCharges';
import {
    PaymentMethodLabels,
    PaymentStatusEnum,
    PaymentStatusLabels
} from '@/api/types/extraCharges';
import type { CurrencyCodeValue } from '@/api/types/reservations';
import { CurrencyCodeLabels } from '@/api/types/reservations';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, CreditCard, Tag, FileText, CheckCircle2, Clock } from 'lucide-react';

interface ExtraChargeDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    charge: ExtraChargeDto | null;
    currency: CurrencyCodeValue;
}

export const ExtraChargeDetailsModal = ({
    isOpen,
    onClose,
    charge,
    currency
}: ExtraChargeDetailsModalProps) => {
    if (!charge) return null;

    const isPaid = charge.paymentStatus === PaymentStatusEnum.Paid;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-slate-100 rounded-3xl shadow-2xl">
                <DialogHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                    <DialogTitle className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                            <FileText className="w-5 h-5" />
                        </div>
                        Extra Charge Details
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Amount Highlight */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</span>
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                            {formatCurrency(charge.amount, CurrencyCodeLabels[currency])}
                        </span>
                        <Badge className={cn(
                            "mt-3 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border-none",
                            isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        )}>
                            <div className="flex items-center gap-1.5">
                                {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                {PaymentStatusLabels[charge.paymentStatus]}
                            </div>
                        </Badge>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Description */}
                        <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-50 bg-white">
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                                <Tag className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description / Category</span>
                                <span className="text-sm font-black text-slate-900">{charge.description}</span>
                            </div>
                        </div>

                        {/* Date */}
                        <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-50 bg-white">
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                                <CalendarDays className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Recorded</span>
                                <span className="text-sm font-bold text-slate-700">{format(new Date(charge.date), 'MMMM d, yyyy HH:mm')}</span>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-50 bg-white">
                            <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">
                                <CreditCard className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</span>
                                <span className="text-sm font-bold text-slate-700">{PaymentMethodLabels[charge.paymentMethod]}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
