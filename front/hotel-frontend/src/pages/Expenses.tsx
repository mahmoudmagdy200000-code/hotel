import { useState } from 'react';
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
    DollarSign
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
} from '../components/ui/select';
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const getCategoryIcon = (category: ExpenseCategoryValue) => {
    switch (category) {
        case ExpenseCategoryEnum.Maintenance: return <Wrench className="w-4 h-4" />;
        case ExpenseCategoryEnum.Purchases: return <ShoppingCart className="w-4 h-4" />;
        case ExpenseCategoryEnum.Breakfast: return <Coffee className="w-4 h-4" />;
        default: return <HelpCircle className="w-4 h-4" />;
    }
};

const Expenses = () => {
    const { t } = useTranslation();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [filters, setFilters] = useState<GetExpensesParams>({
        from: format(new Date(), 'yyyy-MM-01'), // Start of month
        to: format(new Date(), 'yyyy-MM-dd'),
    });

    const { data: expenses, isLoading, isError } = useExpenses(filters);
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
            if (newExpense.currencyCode === CurrencyCodeEnum.Other && !newExpense.currencyOther) {
                toast.error('Currency name is required for "Other"');
                return;
            }

            await createExpenseMutation.mutateAsync({
                ...newExpense,
                currencyOther: newExpense.currencyCode === CurrencyCodeEnum.Other ? newExpense.currencyOther : undefined
            });

            toast.success('Expense logged successfully');
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
            toast.error('Failed to log expense');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-blue-600" />
                        {t('expenses.title', 'Operational Expenses')}
                    </h1>
                    <p className="text-slate-500">
                        {t('expenses.subtitle', 'Track maintenance, purchases, and other operational costs.')}
                    </p>
                </div>

                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 me-2" />
                            {t('expenses.add_btn', 'Log Expense')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>{t('expenses.new_title', 'Log New Expense')}</DialogTitle>
                            <DialogDescription>
                                {t('expenses.new_desc', 'Enter the details of the operational expense below.')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('common.date', 'Date')}</Label>
                                    <Input
                                        type="date"
                                        value={newExpense.businessDate}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense({ ...newExpense, businessDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('expenses.category', 'Category')}</Label>
                                    <Select
                                        value={newExpense.category.toString()}
                                        onValueChange={(v: string) => setNewExpense({ ...newExpense, category: parseInt(v) as ExpenseCategoryValue })}
                                    >
                                        <SelectTrigger>
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
                                <div className="space-y-2">
                                    <Label>{t('expenses.amount', 'Amount')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={newExpense.amount}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('expenses.currency', 'Currency')}</Label>
                                    <Select
                                        value={newExpense.currencyCode.toString()}
                                        onValueChange={(v: string) => setNewExpense({ ...newExpense, currencyCode: parseInt(v) as CurrencyCodeValue })}
                                    >
                                        <SelectTrigger>
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

                            {newExpense.currencyCode === CurrencyCodeEnum.Other && (
                                <div className="space-y-2">
                                    <Label>{t('expenses.currency_other', 'Specify Currency')}</Label>
                                    <Input
                                        placeholder="e.g. GBP"
                                        value={newExpense.currencyOther}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense({ ...newExpense, currencyOther: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>{t('expenses.payment_method', 'Payment Method')}</Label>
                                <Select
                                    value={newExpense.paymentMethod.toString()}
                                    onValueChange={(v: string) => setNewExpense({ ...newExpense, paymentMethod: parseInt(v) as PaymentMethodValue })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={PaymentMethodEnum.Cash.toString()}>Cash</SelectItem>
                                        <SelectItem value={PaymentMethodEnum.Visa.toString()}>Visa / Card</SelectItem>
                                        <SelectItem value={PaymentMethodEnum.Other.toString()}>Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('expenses.vendor', 'Vendor / Supplier')}</Label>
                                <Input
                                    placeholder={t('expenses.vendor_placeholder', 'Optional')}
                                    value={newExpense.vendor}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{t('expenses.description', 'Description')}</Label>
                                <Textarea
                                    placeholder={t('expenses.description_placeholder', 'Detail the expense...')}
                                    value={newExpense.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewExpense({ ...newExpense, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                {t('common.cancel', 'Cancel')}
                            </Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={handleCreateExpense}
                                disabled={createExpenseMutation.isPending}
                            >
                                {createExpenseMutation.isPending ? t('common.saving', 'Saving...') : t('expenses.save', 'Save Expense')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <Input
                                type="date"
                                className="w-40 h-9"
                                value={filters.from}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, from: e.target.value })}
                            />
                            <span className="text-slate-400">to</span>
                            <Input
                                type="date"
                                className="w-40 h-9"
                                value={filters.to}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters({ ...filters, to: e.target.value })}
                            />
                        </div>

                        <div className="h-6 w-px bg-slate-200 hidden md:block" />

                        <Select
                            value={filters.category?.toString() || 'all'}
                            onValueChange={(v: string) => setFilters({ ...filters, category: v === 'all' ? undefined : parseInt(v) as ExpenseCategoryValue })}
                        >
                            <SelectTrigger className="w-40 h-9">
                                <Filter className="w-3.5 h-3.5 me-2 text-slate-400" />
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {Object.entries(ExpenseCategoryLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.currency?.toString() || 'all'}
                            onValueChange={(v: string) => setFilters({ ...filters, currency: v === 'all' ? undefined : parseInt(v) as CurrencyCodeValue })}
                        >
                            <SelectTrigger className="w-40 h-9">
                                <DollarSign className="w-3.5 h-3.5 me-2 text-slate-400" />
                                <SelectValue placeholder="All Currencies" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Currencies</SelectItem>
                                {Object.entries(CurrencyCodeLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-32">{t('common.date', 'Date')}</TableHead>
                                <TableHead className="w-40">{t('expenses.category', 'Category')}</TableHead>
                                <TableHead className="w-40">{t('expenses.amount', 'Amount')}</TableHead>
                                <TableHead className="w-32">{t('expenses.payment', 'Payment')}</TableHead>
                                <TableHead>{t('expenses.description', 'Description')}</TableHead>
                                <TableHead className="w-40">{t('expenses.vendor', 'Vendor')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}><Skeleton className="h-12 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : isError ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-red-500">
                                        {t('expenses.error', 'Failed to load expenses.')}
                                    </TableCell>
                                </TableRow>
                            ) : expenses?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Receipt className="w-12 h-12 text-slate-200" />
                                            <p>{t('expenses.no_data', 'No expenses found for this period.')}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                expenses?.map(expense => (
                                    <TableRow key={expense.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-medium text-slate-600">
                                            {format(new Date(expense.businessDate), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-normal border-slate-200 bg-white gap-1.5 py-1">
                                                    <span className="text-blue-500">{getCategoryIcon(expense.category)}</span>
                                                    {ExpenseCategoryLabels[expense.category]}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-slate-900">
                                            {formatCurrency(expense.amount, expense.currencyCode === CurrencyCodeEnum.Other ? expense.currencyOther : CurrencyCodeLabels[expense.currencyCode])}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-normal">
                                                {expense.paymentMethod === PaymentMethodEnum.Cash ? 'Cash' :
                                                    expense.paymentMethod === PaymentMethodEnum.Visa ? 'Visa' : 'Other'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-md truncate text-slate-600" title={expense.description}>
                                                {expense.description}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-500">
                                            {expense.vendor || '-'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default Expenses;
