import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
    Receipt,
    Plus,
    Filter,
    Calendar,
    Wrench,
    ShoppingCart,
    Coffee,
    HelpCircle,
    DollarSign,
    PieChart,
    Building2,
    RefreshCw,
    AlertCircle,
    Briefcase
} from 'lucide-react';
import { useExpenses, useCreateExpense } from '@/hooks/expenses/useExpenses';
import {
    ExpenseCategoryEnum,
    ExpenseCategoryLabels,
} from '@/api/types/expenses';
import type { GetExpensesParams, ExpenseCategoryValue } from '@/api/types/expenses';
import { CurrencyCodeLabels, CurrencyCodeEnum, PaymentMethodEnum } from '@/api/types/reservations';
import type { CurrencyCodeValue, PaymentMethodValue } from '@/api/types/reservations';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Ras Sedr Rental - Operational Expenditure Ledger
 * High-density tracking for maintenance, logistics, and resource procurement.
 */

const CATEGORY_STYLE: Record<number, { icon: any; color: string; bg: string }> = {
    [ExpenseCategoryEnum.Maintenance]: { icon: Wrench, color: 'text-rose-600', bg: 'bg-rose-50' },
    [ExpenseCategoryEnum.Purchases]: { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    [ExpenseCategoryEnum.Breakfast]: { icon: Coffee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const DEFAULT_CATEGORY = { icon: HelpCircle, color: 'text-slate-400', bg: 'bg-slate-50' };

const Expenses = () => {
    const { t } = useTranslation();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filters, setFilters] = useState<GetExpensesParams>({
        from: format(new Date(), 'yyyy-MM-01'),
        to: format(new Date(), 'yyyy-MM-dd'),
    });

    const { data: expenses, isLoading, isError, refetch, isFetching } = useExpenses(filters);
    const createExpenseMutation = useCreateExpense();

    const [newExpense, setNewExpense] = useState<{
        businessDate: string;
        category: ExpenseCategoryValue;
        amount: number;
        currencyCode: CurrencyCodeValue;
        currencyOther: string;
        paymentMethod: PaymentMethodValue;
        description: string;
        vendor: string;
    }>({
        businessDate: format(new Date(), 'yyyy-MM-dd'),
        category: ExpenseCategoryEnum.Purchases,
        amount: 0,
        currencyCode: CurrencyCodeEnum.EGP,
        currencyOther: '',
        paymentMethod: PaymentMethodEnum.Cash,
        description: '',
        vendor: ''
    });

    const stats = useMemo(() => {
        if (!expenses) return { total: 0, count: 0, topCategory: '—' };
        const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const categories = expenses.reduce((acc: any, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});
        const topCat = Object.entries(categories).sort((a: any, b: any) => b[1] - a[1])[0];

        return {
            total,
            count: expenses.length,
            topCategory: topCat ? ExpenseCategoryLabels[parseInt(topCat[0]) as ExpenseCategoryValue] : '—'
        };
    }, [expenses]);

    const handleCreateExpense = async () => {
        try {
            if (!newExpense.description) {
                toast.error('Description is required');
                return;
            }
            if (newExpense.amount <= 0) {
                toast.error('Amount must be greater than 0');
                return;
            }

            await createExpenseMutation.mutateAsync({
                ...newExpense,
                currencyOther: newExpense.currencyCode === CurrencyCodeEnum.Other ? newExpense.currencyOther : undefined
            });

            toast.success('Expenditure logged in ledger.');
            setIsCreateModalOpen(false);
            setNewExpense({
                businessDate: format(new Date(), 'yyyy-MM-dd'),
                category: ExpenseCategoryEnum.Purchases,
                amount: 0,
                currencyCode: CurrencyCodeEnum.EGP,
                currencyOther: '',
                paymentMethod: PaymentMethodEnum.Cash,
                description: '',
                vendor: ''
            });
        } catch (error) {
            toast.error('Failed to commit expenditure.');
        }
    };

    return (
        <div className="space-y-6 pb-24 sm:pb-8">
            {/* STICKY NAVY ACTION BAR */}
            <div className="sticky top-0 z-40 -mx-4 sm:mx-0 px-4 py-4 bg-slate-900 shadow-2xl sm:rounded-3xl sm:static sm:bg-slate-900 border-b border-white/5">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <Receipt className="w-5 h-5 text-rose-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white uppercase tracking-tighter leading-none">
                                    {t('expenses.title')}
                                </h1>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        {filters.from} → {filters.to}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                                <DialogTrigger asChild>
                                    <Button className="hidden sm:flex bg-rose-600 hover:bg-rose-700 h-9 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-900/20 active:scale-95 transition-all">
                                        <Plus className="w-4 h-4 mr-1.5" />
                                        {t('expenses.add_btn')}
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px] rounded-[32px] border-none shadow-2xl p-0 overflow-hidden">
                                    <div className="bg-slate-900 p-8 text-white">
                                        <h2 className="text-xl font-black uppercase tracking-tighter">{t('expenses.new_title')}</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">Expenditure Authorization</p>
                                    </div>
                                    <div className="p-8 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temporal Date</Label>
                                                <Input type="date" value={newExpense.businessDate} onChange={(e) => setNewExpense({ ...newExpense, businessDate: e.target.value })} className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('expenses.category')}</Label>
                                                <Select value={newExpense.category.toString()} onValueChange={(v) => setNewExpense({ ...newExpense, category: parseInt(v) as ExpenseCategoryValue })}>
                                                    <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(ExpenseCategoryLabels).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Capital Amount</Label>
                                                <Input type="number" min="0" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })} className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Denomination</Label>
                                                <Select value={newExpense.currencyCode.toString()} onValueChange={(v) => setNewExpense({ ...newExpense, currencyCode: parseInt(v) as CurrencyCodeValue })}>
                                                    <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(CurrencyCodeLabels).map(([value, label]) => (
                                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settlement Method</Label>
                                            <Select value={newExpense.paymentMethod.toString()} onValueChange={(v) => setNewExpense({ ...newExpense, paymentMethod: parseInt(v) as PaymentMethodValue })}>
                                                <SelectTrigger className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={PaymentMethodEnum.Cash.toString()}>CASH SETTLEMENT</SelectItem>
                                                    <SelectItem value={PaymentMethodEnum.Visa.toString()}>CARD / DIGITAL</SelectItem>
                                                    <SelectItem value={PaymentMethodEnum.Other.toString()}>OTHER FLOW</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor Artifact</Label>
                                            <Input placeholder="Supplier or Shop name..." value={newExpense.vendor} onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })} className="rounded-xl bg-slate-50 border-slate-100 font-bold h-11" />
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operational Narrative</Label>
                                            <Textarea placeholder="Details of the expenditure..." value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="rounded-xl bg-slate-50 border-slate-100 font-bold min-h-[100px]" />
                                        </div>
                                    </div>
                                    <div className="p-8 pt-0 flex gap-3">
                                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1 h-12 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400">Abort</Button>
                                        <Button onClick={handleCreateExpense} disabled={createExpenseMutation.isPending} className="flex-[2] h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-rose-900/10">
                                            {createExpenseMutation.isPending ? 'Committing...' : 'Commit to Ledger'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white"
                                onClick={() => refetch()}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5 text-slate-400", isFetching && "animate-spin text-rose-400")} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-inner h-10">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2" />
                            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0 outline-none w-[110px]" />
                            <span className="text-[10px] text-slate-300 font-black">TO</span>
                            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="bg-transparent border-none text-[10px] font-black uppercase focus:ring-0 outline-none w-[110px]" />
                        </div>

                        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                            <Select
                                value={filters.category?.toString() || 'all'}
                                onValueChange={(v) => setFilters({ ...filters, category: v === 'all' ? undefined : parseInt(v) as ExpenseCategoryValue })}
                            >
                                <SelectTrigger className="h-10 rounded-xl bg-white border-none shadow-inner text-[10px] font-black uppercase tracking-widest pl-4">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-3 h-3 text-slate-400" />
                                        <SelectValue placeholder="All Categories" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {Object.entries(ExpenseCategoryLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* PULSE KPI GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard
                    title="Gross Burn"
                    value={formatCurrency(stats.total, 'EGP')}
                    icon={<DollarSign className="w-4 h-4 text-rose-600" />}
                    bg="bg-rose-100"
                    trend="Operational Load"
                />
                <MetricCard
                    title="Artifact Count"
                    value={stats.count}
                    icon={<Receipt className="w-4 h-4 text-blue-600" />}
                    bg="bg-blue-100"
                    trend="Ledger Entries"
                />
                <MetricCard
                    title="Primary Factor"
                    value={stats.topCategory}
                    icon={<PieChart className="w-4 h-4 text-amber-600" />}
                    bg="bg-amber-100"
                    trend="Top Expenditure"
                />
                <MetricCard
                    title="Active Mode"
                    value="Audit"
                    icon={<Briefcase className="w-4 h-4 text-slate-600" />}
                    bg="bg-slate-100"
                    trend="Financial Integrity"
                />
            </div>

            {/* EXPENDITURE LEDGER */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[32px]" />)}
                    </div>
                ) : isError ? (
                    <Alert variant="destructive" className="rounded-[32px] border-rose-100 bg-rose-50 p-8 shadow-sm">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-white rounded-full shadow-sm"><AlertCircle className="w-8 h-8 text-rose-500" /></div>
                            <div className="space-y-1">
                                <AlertTitle className="text-sm font-black text-rose-900 uppercase tracking-tighter">Sync Denied</AlertTitle>
                                <AlertDescription className="text-xs font-bold text-rose-600/70">Expenditure data could not be retrieved from the main cluster.</AlertDescription>
                            </div>
                            <Button variant="outline" className="mt-2 border-rose-200" onClick={() => refetch()}>Force Refresh</Button>
                        </div>
                    </Alert>
                ) : (expenses || []).length === 0 ? (
                    <div className="py-24 text-center flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                        <div className="p-8 bg-white rounded-full shadow-inner opacity-60">
                            <Receipt className="w-12 h-12 text-slate-200" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Zero Burn Detected</h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter opacity-60">No financial artifacts registered for this temporal range.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: LEDGER CARDS */}
                        <div className="grid grid-cols-1 gap-4 sm:hidden">
                            {(expenses || []).map((expense) => {
                                const style = CATEGORY_STYLE[expense.category] || DEFAULT_CATEGORY;
                                const Icon = style.icon;
                                return (
                                    <div key={expense.id} className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm p-6 space-y-4 relative group">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2.5 rounded-2xl transition-all shadow-sm", style.bg, style.color)}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 text-sm uppercase tracking-tighter">{ExpenseCategoryLabels[expense.category]}</h3>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(expense.businessDate), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-base font-black text-slate-900 tracking-tighter">
                                                    {formatCurrency(expense.amount, expense.currencyCode === CurrencyCodeEnum.Other ? expense.currencyOther : CurrencyCodeLabels[expense.currencyCode])}
                                                </div>
                                                <Badge className="bg-slate-900 text-white font-black text-[8px] uppercase tracking-widest px-2 py-0 border-none">
                                                    {expense.paymentMethod === PaymentMethodEnum.Cash ? 'CASH' : 'DIGITAL'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 italic text-[11px] font-bold text-slate-500 leading-snug">
                                            "{expense.description}"
                                        </div>
                                        {expense.vendor && (
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                                                <Building2 className="w-3.5 h-3.5 text-slate-300" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{expense.vendor}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* DESKTOP: PREMIUM LEDGER TABLE */}
                        <div className="hidden sm:block rounded-[32px] border border-slate-100 shadow-sm overflow-hidden bg-white">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-b border-slate-100 font-black text-[10px] uppercase tracking-widest text-slate-400">
                                        <TableHead className="px-8 py-5">Temporal</TableHead>
                                        <TableHead className="py-5">Classification</TableHead>
                                        <TableHead className="py-5">Artifact Description</TableHead>
                                        <TableHead className="py-5">Settlement</TableHead>
                                        <TableHead className="py-5 pr-8 text-right">Burn Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(expenses || []).map((expense) => {
                                        const style = CATEGORY_STYLE[expense.category] || DEFAULT_CATEGORY;
                                        const Icon = style.icon;
                                        return (
                                            <TableRow key={expense.id} className="hover:bg-slate-50/50 transition-all group">
                                                <TableCell className="px-8 py-5">
                                                    <div className="font-black text-slate-900 uppercase tracking-tighter text-xs">
                                                        {format(new Date(expense.businessDate), 'MMM dd, yyyy')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("p-2 rounded-xl", style.bg, style.color)}><Icon className="w-3.5 h-3.5" /></div>
                                                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{ExpenseCategoryLabels[expense.category]}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="max-w-md truncate font-bold text-slate-500 text-xs italic" title={expense.description}>"{expense.description}"</div>
                                                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">{expense.vendor || 'DIRECT PROCUREMENT'}</div>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5 shadow-sm">
                                                        {expense.paymentMethod === PaymentMethodEnum.Cash ? 'CASH FLOW' : 'DIGITAL SYNC'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-5 pr-8 text-right">
                                                    <div className="text-sm font-black text-slate-900 tracking-tighter group-hover:scale-105 transition-transform">
                                                        {formatCurrency(expense.amount, expense.currencyCode === CurrencyCodeEnum.Other ? expense.currencyOther : CurrencyCodeLabels[expense.currencyCode])}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </div>

            {/* FAB MOBILE */}
            <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="sm:hidden fixed bottom-24 right-6 h-14 w-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-2xl shadow-rose-900/40 active:scale-95 transition-all z-40 border-4 border-white/20"
                size="icon"
            >
                <Plus className="w-7 h-7" />
            </Button>
        </div>
    );
};

const MetricCard = ({ title, value, icon, bg, trend }: { title: string, value: string | number, icon: React.ReactNode, bg: string, trend: string }) => (
    <Card className="border border-slate-100 shadow-sm transition-all active:scale-[0.98] group rounded-[32px] overflow-hidden bg-white">
        <CardContent className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
                <div className={cn("p-1.5 rounded-xl transition-all shadow-sm", bg)}>{icon}</div>
            </div>
            <h3 className="text-xl font-black text-slate-900 leading-none tracking-tighter truncate">{value}</h3>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{trend}</span>
        </CardContent>
    </Card>
);

export default Expenses;
