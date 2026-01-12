import { api } from './api';

export interface CreateIncomeRequest {
  name?: string;
  category: string;
  amount: number;
  date: string;
  isRecurring?: boolean;
}

export interface UpdateIncomeRequest {
  name?: string;
  category?: string;
  amount?: number;
  date?: string;
}

export interface Income {
  id: string;
  userId: string;
  name: string | null;
  category: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  recurringGroupId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncomesResponse {
  data: Income[];
}

export interface IncomeResponse {
  data: Income;
}

export interface CreateIncomeResponse {
  message: string;
  data: Income[];
}

export interface UpdateIncomeResponse {
  message: string;
  data: Income;
}

export interface Stats {
  balance: number; // em centavos
  balanceChange: number; // percentual
  income: number; // em centavos
  incomeChange: number; // percentual
  expense: number; // em centavos
  expenseChange: number; // percentual
}

export interface StatsResponse {
  data: Stats;
}

type Period = 'this-month' | 'last-month' | 'this-year' | 'last-12-months';

export const incomesService = {
  async create(data: CreateIncomeRequest): Promise<CreateIncomeResponse> {
    const response = await api.post<CreateIncomeResponse>('/incomes', data);
    return response.data;
  },

  async findAll(period?: Period): Promise<IncomesResponse> {
    const params = period ? { period } : {};
    const response = await api.get<IncomesResponse>('/incomes', { params });
    return response.data;
  },

  async getStats(period: Period = 'this-month'): Promise<StatsResponse> {
    const response = await api.get<StatsResponse>('/incomes/stats', {
      params: { period },
    });
    return response.data;
  },

  async findOne(id: string): Promise<IncomeResponse> {
    const response = await api.get<IncomeResponse>(`/incomes/${id}`);
    return response.data;
  },

  async update(
    id: string,
    data: UpdateIncomeRequest,
  ): Promise<UpdateIncomeResponse> {
    const response = await api.put<UpdateIncomeResponse>(
      `/incomes/${id}`,
      data,
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/incomes/${id}`);
  },

  async findByCategory(category: string): Promise<IncomesResponse> {
    const response = await api.get<IncomesResponse>(
      `/incomes/category/${category}`,
    );
    return response.data;
  },

  async getLatestTransactions(limit: number = 10): Promise<{
    data: Array<{
      id: string;
      description: string;
      categoryIcon: string;
      category: string;
      date: string;
      amount: number;
      type: 'income' | 'expense';
    }>;
  }> {
    const response = await api.get('/incomes/latest-transactions', {
      params: { limit },
    });
    return response.data;
  },
};
