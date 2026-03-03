import { api } from './api';

export interface CreateExpenseRequest {
  name?: string;
  category: string;
  amount: number;
  date: string;
  is_paid?: boolean;
  cardId?: string | null;
  installments?: number | null;
}

export interface UpdateExpenseRequest {
  name?: string;
  category?: string;
  amount?: number;
  date?: string;
  is_paid?: boolean;
  cardId?: string | null;
  installments?: number | null;
}

export interface Expense {
  id: string;
  userId: string;
  name: string | null;
  category: string;
  amount: number;
  date: string; // Data de vencimento/pagamento (para filtros)
  purchaseDate: string | null; // Data original da compra (para exibição)
  is_paid: boolean;
  cardId: string | null;
  installments: number | null;
  installmentNumber: number | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesResponse {
  data: Expense[];
}

export interface ExpenseResponse {
  data: Expense;
}

export interface CreateExpenseResponse {
  message: string;
  data: Expense;
}

export interface UpdateExpenseResponse {
  message: string;
  data: Expense;
}

type Period = 'this-month' | 'last-month' | 'this-year' | 'last-12-months';

export const expensesService = {
  async create(data: CreateExpenseRequest): Promise<CreateExpenseResponse> {
    const response = await api.post<CreateExpenseResponse>('/expenses', data);
    return response.data;
  },

  async findAll(period?: Period): Promise<ExpensesResponse> {
    const params = period ? { period } : {};
    const response = await api.get<ExpensesResponse>('/expenses', { params });
    return response.data;
  },

  async findOne(id: string): Promise<ExpenseResponse> {
    const response = await api.get<ExpenseResponse>(`/expenses/${id}`);
    return response.data;
  },

  async update(
    id: string,
    data: UpdateExpenseRequest,
    updateGroup?: boolean,
  ): Promise<UpdateExpenseResponse> {
    const params = updateGroup ? { updateGroup: 'true' } : {};
    const response = await api.put<UpdateExpenseResponse>(
      `/expenses/${id}`,
      data,
      { params },
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/expenses/${id}`);
  },

  async findByGroupId(groupId: string): Promise<ExpensesResponse> {
    const response = await api.get<ExpensesResponse>(
      `/expenses/group/${groupId}`,
    );
    return response.data;
  },

  async deleteGroup(groupId: string): Promise<void> {
    await api.delete(`/expenses/group/${groupId}`);
  },

  async findByCategory(category: string): Promise<ExpensesResponse> {
    const response = await api.get<ExpensesResponse>(
      `/expenses/category/${category}`,
    );
    return response.data;
  },

  async getByCategory(
    period?: Period,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    data: Array<{
      name: string;
      percentage: number;
      color: string;
      icon: string | null;
      value: number;
    }>;
  }> {
    const params: Record<string, string> = {};
    if (period) {
      params.period = period;
    }
    if (startDate && endDate) {
      params.startDate = startDate.toISOString().split('T')[0];
      params.endDate = endDate.toISOString().split('T')[0];
    }
    const response = await api.get('/expenses/by-category/stats', {
      params,
    });
    return response.data;
  },
};
