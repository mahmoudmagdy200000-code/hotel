import { Card, CardContent } from '@/components/ui/card';
import { Wallet, RefreshCw, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn } from '@/lib/utils';
import { CurrencyCodeLabels } from '@/api/types/reservations';
import { useDailyCashFlow } from '@/hooks/dashboard';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface DailyCashFlowCardProps {
    businessDate: string;
    currency: number;
}

export const DailyCashFlowCard = ({ businessDate, currency }: DailyCashFlowCardProps) => {
    const { data, isLoading, isFetching, refetch } = useDailyCashFlow({
        businessDate,
        currency
    });
    const [expanded, setExpanded] = useState(false);

    /** Render UTC DateTimeOffset as Egypt local HH:mm */
    const toLocalTime = (iso: string) =>
        new Date(iso).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });

    if (isLoading) {
        return <Skeleton className="h-28 w-full rounded-2xl bg-slate-50 border border-slate-100" />;
    }

    const value = data?.netCashInDrawer ?? 0;
    const currencyLabel = CurrencyCodeLabels[currency as keyof typeof CurrencyCodeLabels];

    return (
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden transition-all relative group bg-emerald-950">
            <CardContent className="p-3 flex flex-col gap-2 relative z-10">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        NET CASH IN DRAWER
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-lg bg-white/5 text-emerald-400 hover:bg-white/10 border-none"
                            onClick={() => refetch()}
                            disabled={isFetching}
                        >
                            <RefreshCw className={cn("h-3 w-3", isFetching && "animate-spin")} />
                        </Button>
                        <div className="p-1.5 rounded-xl shadow-sm bg-emerald-500/10">
                            <Wallet className="w-4 h-4 text-emerald-400" />
                        </div>
                    </div>
                </div>
                <h3 className="text-xl font-black tracking-tighter leading-none text-white">
                    {formatCurrency(value, currencyLabel)}
                </h3>
                <div className="flex items-center justify-between">
                    <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                        Cashier Mode • {new Date().toLocaleTimeString()}
                    </p>
                    {data && (data.cashPayments.length > 0 || data.cashExtraCharges.length > 0 || data.cashExpenses.length > 0) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-[8px] font-black uppercase tracking-widest text-emerald-400 hover:bg-white/10 border-none rounded-lg gap-1"
                            onClick={() => setExpanded(!expanded)}
                        >
                            {expanded ? 'Hide' : 'Details'}
                            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                    )}
                </div>

                {/* ─── Expandable Breakdown ─────────────────────────── */}
                {expanded && data && (
                    <div className="mt-2 space-y-3 border-t border-emerald-800/50 pt-3">
                        {/* Subtotals Bar */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-emerald-900/50 rounded-xl p-2">
                                <ArrowUpRight className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
                                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Payments</p>
                                <p className="text-xs font-black text-emerald-300 tracking-tight">{formatCurrency(data.totalCashPayments, currencyLabel)}</p>
                            </div>
                            <div className="bg-blue-900/30 rounded-xl p-2">
                                <Sparkles className="w-3 h-3 text-blue-400 mx-auto mb-1" />
                                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Services</p>
                                <p className="text-xs font-black text-blue-300 tracking-tight">{formatCurrency(data.totalCashExtraCharges, currencyLabel)}</p>
                            </div>
                            <div className="bg-rose-900/30 rounded-xl p-2">
                                <ArrowDownRight className="w-3 h-3 text-rose-400 mx-auto mb-1" />
                                <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Expenses</p>
                                <p className="text-xs font-black text-rose-300 tracking-tight">-{formatCurrency(data.totalCashExpenses, currencyLabel)}</p>
                            </div>
                        </div>

                        {/* Cash Payments List */}
                        {data.cashPayments.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Cash Payments ({data.cashPayments.length})</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {data.cashPayments.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between bg-emerald-900/30 rounded-lg px-2.5 py-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-emerald-500">Res #{p.reservationId}</span>
                                                <span className="text-[8px] text-emerald-700">{toLocalTime(p.time)}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-emerald-300">+{formatCurrency(p.amount, currencyLabel)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cash Extra Charges List */}
                        {data.cashExtraCharges.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Extra Services ({data.cashExtraCharges.length})</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {data.cashExtraCharges.map((e, i) => (
                                        <div key={i} className="flex items-center justify-between bg-blue-900/20 rounded-lg px-2.5 py-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-blue-400 truncate max-w-[120px]">{e.description}</span>
                                                <span className="text-[8px] text-blue-700">{toLocalTime(e.time)}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-blue-300">+{formatCurrency(e.amount, currencyLabel)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cash Expenses List */}
                        {data.cashExpenses.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest">Cash Expenses ({data.cashExpenses.length})</p>
                                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                                    {data.cashExpenses.map((e, i) => (
                                        <div key={i} className="flex items-center justify-between bg-rose-900/20 rounded-lg px-2.5 py-1.5">
                                            <span className="text-[9px] font-bold text-rose-400 truncate max-w-[160px]">{e.description}</span>
                                            <span className="text-[10px] font-black text-rose-300">-{formatCurrency(e.amount, currencyLabel)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {data.cashPayments.length === 0 && data.cashExtraCharges.length === 0 && data.cashExpenses.length === 0 && (
                            <p className="text-center text-[9px] text-emerald-700 font-bold py-2">No cash transactions today</p>
                        )}
                    </div>
                )}
            </CardContent>
            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
                <Wallet className="w-12 h-12 text-white" />
            </div>
        </Card>
    );
};
