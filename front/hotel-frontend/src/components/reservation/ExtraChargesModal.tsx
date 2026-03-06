import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, ShoppingBag, CheckCircle, Clock, CreditCard, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useExtraChargeMutations } from '@/hooks/reservations/useExtraChargeMutations';
import { CurrencyCodeEnum, CurrencyCodeLabels } from '@/api/types/reservations';
import { PaymentStatusEnum, PaymentMethodEnum } from '@/api/types/extraCharges';
import type { ExtraChargeDto, CreateExtraChargeCommand, PaymentMethodValue } from '@/api/types/extraCharges';
import type { CurrencyCodeValue } from '@/api/types/reservations';
import { formatCurrency, extractErrorMessage } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExtraChargesModalProps {
    isOpen: boolean;
    onClose: () => void;
    reservationId: number;
    /** Existing charges already saved (e.g. returned from reservation detail if backend adds them). */
    charges?: ExtraChargeDto[];
    /** Currency in use for this reservation. */
    currencyCode?: CurrencyCodeValue;
    guestName?: string;
}

// ─── Quick-add presets ────────────────────────────────────────────────────────

const QUICK_ITEMS = [
    { label: 'Room Service', emoji: '🍽️' },
    { label: 'Mini Bar', emoji: '🍾' },
    { label: 'Laundry', emoji: '👕' },
    { label: 'Private Tour', emoji: '🗺️' },
    { label: 'Spa / Massage', emoji: '💆' },
    { label: 'Late Checkout', emoji: '🕙' },
    { label: 'Extra Bedding', emoji: '🛏️' },
    { label: 'Airport Transfer', emoji: '🚗' },
];

// ─── Payment Method toggle options ───────────────────────────────────────────

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethodValue; label: string; icon: React.ReactNode }[] =
    [
        {
            value: PaymentMethodEnum.Cash,
            label: 'Cash',
            icon: <Banknote className="w-3.5 h-3.5" />,
        },
        {
            value: PaymentMethodEnum.Visa,
            label: 'Card',
            icon: <CreditCard className="w-3.5 h-3.5" />,
        },
    ];

// ─── Component ────────────────────────────────────────────────────────────────

const ExtraChargesModal = ({
    isOpen,
    onClose,
    reservationId,
    charges = [],
    currencyCode = CurrencyCodeEnum.EGP,
    guestName,
}: ExtraChargesModalProps) => {
    const { addCharge, removeCharge } = useExtraChargeMutations(reservationId);

    // Form state
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCodeValue>(currencyCode);
    const [paymentStatus, setPaymentStatus] = useState<0 | 1>(PaymentStatusEnum.Paid);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>(PaymentMethodEnum.Cash);

    const handleQuickItem = (label: string) => setDescription(label);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
            toast.error('Please enter a valid description and amount.');
            return;
        }

        const command: CreateExtraChargeCommand = {
            reservationId,
            description: description.trim(),
            amount: parsedAmount,
            date: new Date().toISOString(),
            currencyCode: selectedCurrency,
            paymentStatus,
            paymentMethod,
        };

        try {
            await addCharge.mutateAsync(command);
            toast.success('Extra charge added successfully.');
            setDescription('');
            setAmount('');
            setSelectedCurrency(currencyCode);
            setPaymentStatus(PaymentStatusEnum.Paid);
            setPaymentMethod(PaymentMethodEnum.Cash);
        } catch (err) {
            toast.error(`Failed to add charge: ${extractErrorMessage(err)}`);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await removeCharge.mutateAsync(id);
            toast.success('Charge removed.');
        } catch (err) {
            toast.error(`Failed to remove: ${extractErrorMessage(err)}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
                {/* ── Header ── */}
                <DialogHeader className="bg-slate-900 px-8 py-7 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-amber-400/10 rounded-2xl ring-1 ring-amber-400/20">
                            <ShoppingBag className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-black uppercase tracking-tighter text-white">
                                Extra Charges
                            </DialogTitle>
                            {guestName && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                    {guestName}
                                </p>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50">
                    {/* ── Existing Charges List ── */}
                    {charges.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Recorded Charges
                            </p>
                            {charges.map((charge) => (
                                <div
                                    key={charge.id}
                                    className="flex items-center justify-between bg-white rounded-[20px] px-5 py-4 border border-slate-100 shadow-sm group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-xl ${charge.paymentStatus === PaymentStatusEnum.Paid
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-amber-50 text-amber-600'}`}>
                                            {charge.paymentStatus === PaymentStatusEnum.Paid
                                                ? <CheckCircle className="w-3.5 h-3.5" />
                                                : <Clock className="w-3.5 h-3.5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                                {charge.description}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {charge.paymentStatus === PaymentStatusEnum.Paid ? 'PAID' : 'PENDING'}
                                                {' · '}
                                                {charge.paymentMethod === PaymentMethodEnum.Cash ? '💵 Cash' : '💳 Card'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-black text-slate-900">
                                            {formatCurrency(charge.amount, CurrencyCodeLabels[selectedCurrency])}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(charge.id)}
                                            disabled={removeCharge.isPending}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl hover:bg-rose-50 text-rose-400 hover:text-rose-600 transition-all"
                                        >
                                            {removeCharge.isPending ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Quick Items ── */}
                    <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Quick Add
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                            {QUICK_ITEMS.map((item) => (
                                <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => handleQuickItem(item.label)}
                                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-[16px] border text-center transition-all text-[9px] font-black uppercase tracking-wide
                                        ${description === item.label
                                            ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-95'
                                            : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <span className="text-lg">{item.emoji}</span>
                                    <span className="leading-tight">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Add Form ── */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            New Charge
                        </p>

                        {/* Description */}
                        <input
                            type="text"
                            placeholder="Description (e.g. Room Service)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={200}
                            className="w-full h-12 px-5 text-sm font-bold bg-white border border-slate-200 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-300 transition-all"
                        />

                        {/* Amount + Currency */}
                        <div className="flex gap-3">
                            <input
                                type="number"
                                placeholder="Amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0.01"
                                step="0.01"
                                className="flex-1 h-12 px-5 text-sm font-bold bg-white border border-slate-200 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-300 transition-all"
                            />
                            {/* Currency Selector */}
                            <div className="flex-1">
                                <select
                                    value={selectedCurrency}
                                    onChange={(e) => setSelectedCurrency(Number(e.target.value) as CurrencyCodeValue)}
                                    className="w-full h-12 px-4 text-sm font-bold bg-white border border-slate-200 rounded-[16px] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all appearance-none cursor-pointer"
                                >
                                    {(Object.entries(CurrencyCodeLabels) as [string, string][]).map(([code, label]) => (
                                        <option key={code} value={code}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Payment Method + Payment Status row */}
                        <div className="flex gap-3">
                            {/* Payment Method Toggle (Cash / Card) */}
                            <div className="flex gap-1.5 flex-1 bg-slate-100 p-1 rounded-[14px]">
                                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setPaymentMethod(opt.value)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all
                                            ${paymentMethod === opt.value
                                                ? opt.value === PaymentMethodEnum.Cash
                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                                    : 'bg-violet-500 text-white shadow-md shadow-violet-500/20'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {opt.icon}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {/* Payment Status Toggle (Paid / Pending) */}
                            <button
                                type="button"
                                onClick={() => setPaymentStatus(s => s === PaymentStatusEnum.Paid ? PaymentStatusEnum.Pending : PaymentStatusEnum.Paid)}
                                className={`px-4 h-12 rounded-[16px] text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 whitespace-nowrap
                                    ${paymentStatus === PaymentStatusEnum.Paid
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                                        : 'bg-amber-50 text-amber-600 border-amber-200'
                                    }`}
                            >
                                {paymentStatus === PaymentStatusEnum.Paid
                                    ? <><CheckCircle className="w-3.5 h-3.5" /> Paid</>
                                    : <><Clock className="w-3.5 h-3.5" /> Pending</>}
                            </button>
                        </div>

                        {/* Cash warning hint */}
                        {paymentMethod !== PaymentMethodEnum.Cash && (
                            <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                Card charges won't appear in Net Cash in Drawer
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={addCharge.isPending || !description.trim() || !amount}
                            className="w-full h-12 rounded-[16px] bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {addCharge.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="w-4 h-4 mr-2" />
                            )}
                            Add Charge
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ExtraChargesModal;
