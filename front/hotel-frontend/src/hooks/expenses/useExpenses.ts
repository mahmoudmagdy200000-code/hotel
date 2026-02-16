import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenses, createExpense, getExpenseById } from '@/api/expenses';
import type { GetExpensesParams, CreateExpenseCommand } from '@/api/types/expenses';

export const expenseKeys = {
    all: ['expenses'] as const,
    lists: () => [...expenseKeys.all, 'list'] as const,
    list: (params: GetExpensesParams) => [...expenseKeys.lists(), params] as const,
    details: () => [...expenseKeys.all, 'detail'] as const,
    detail: (id: number) => [...expenseKeys.details(), id] as const,
};

export const useExpenses = (params: GetExpensesParams) => {
    return useQuery({
        queryKey: expenseKeys.list(params),
        queryFn: () => getExpenses(params),
    });
};

export const useExpense = (id: number) => {
    return useQuery({
        queryKey: expenseKeys.detail(id),
        queryFn: () => getExpenseById(id),
        enabled: !!id,
    });
};

export const useCreateExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (command: CreateExpenseCommand) => createExpense(command),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: expenseKeys.lists() });
        },
    });
};
