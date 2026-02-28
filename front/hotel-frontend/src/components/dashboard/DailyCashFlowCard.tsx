import { Card, CardContent } from '@/components/ui/card';
import { Wallet, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn } from '@/lib/utils';
import { CurrencyCodeLabels } from '@/api/types/reservations';
import { useDailyCashFlow } from '@/hooks/dashboard';
import { Button } from '@/components/ui/button';

interface DailyCashFlowCardProps {
    businessDate: string;
    currency: number;
}

export const DailyCashFlowCard = ({ businessDate, currency }: DailyCashFlowCardProps) => {
    const { data, isLoading, isFetching, refetch } = useDailyCashFlow({
        businessDate,
        currency
    });

    if (isLoading) {
        return <Skeleton className="h-28 w-full rounded-2xl bg-slate-50 border border-slate-100" />;
    }

    const value = data?.netCashInDrawer ?? 0;
    const currencyLabel = CurrencyCodeLabels[currency as keyof typeof CurrencyCodeLabels];

    return (
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden transition-all active:scale-[0.98] relative group bg-emerald-950">
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
                <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none">
                    Cashier Mode • {new Date().toLocaleTimeString()}
                </p>
            </CardContent>
            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
                <Wallet className="w-12 h-12 text-white" />
            </div>
        </Card>
    );
};
