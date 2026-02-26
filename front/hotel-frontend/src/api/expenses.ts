import http from './http';
import type { CreateExpenseCommand, ExpenseDto, GetExpensesParams, ExpensesSummaryDto } from './types/expenses';

export const getExpenses = async (params: GetExpensesParams): Promise<ExpensesSummaryDto> => {
    const response = await http.get<ExpensesSummaryDto>('expenses', { params });
    return response.data;
};

export const getExpenseById = async (id: number): Promise<ExpenseDto> => {
    const response = await http.get<ExpenseDto>(`expenses/${id}`);
    return response.data;
};

export const createExpense = async (command: CreateExpenseCommand): Promise<ExpenseDto> => {
    const response = await http.post<ExpenseDto>('expenses', command);
    return response.data;
};
