import { api } from './api';

export const OperationType = {
  BUY: 'buy',
  SELL: 'sell',
  DIVIDEND: 'dividend',
  INTEREST: 'interest',
  STOCK_SPLIT: 'stock_split',
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

export interface CreateInvestmentOperationRequest {
  asset: string;
  assetClass?: string;
  type: OperationType;
  date: string;
  quantity: number;
  price: number;
  currency?: string;
  broker?: string;
  notes?: string;
}

export interface UpdateInvestmentOperationRequest {
  asset?: string;
  assetClass?: string;
  type?: OperationType;
  date?: string;
  quantity?: number;
  price?: number;
  currency?: string;
  broker?: string;
  notes?: string;
}

export interface InvestmentOperation {
  id: string;
  userId: string;
  asset: string;
  assetClass: string;
  type: OperationType;
  date: string;
  quantity: number;
  price: number;
  totalAmount: number;
  currency: string;
  broker: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  asset: string;
  assetClass: string;
  quantity: number;
  averagePrice: number;
  currentValue: number;
  totalInvested: number;
  profit: number;
  profitPercentage: number;
  portfolioPercentage: number;
  broker: string | null;
  currency: string;
  averageHoldingTime: number;
}

export interface MonthlyEvolution {
  month: string;
  portfolioValue: number;
  contributions: number;
  withdrawals: number;
  dividends: number;
  returns: number;
  cumulativeContributions: number;
  cumulativeDividends: number;
}

export const investmentsService = {
  async createOperation(
    data: CreateInvestmentOperationRequest,
  ): Promise<{ message: string; data: InvestmentOperation }> {
    const response = await api.post<{ message: string; data: InvestmentOperation }>(
      '/investments/operations',
      data,
    );
    return response.data;
  },

  async getAllOperations(): Promise<{ data: InvestmentOperation[] }> {
    const response = await api.get<{ data: InvestmentOperation[] }>(
      '/investments/operations',
    );
    return response.data;
  },

  async getOperation(id: string): Promise<{ data: InvestmentOperation }> {
    const response = await api.get<{ data: InvestmentOperation }>(
      `/investments/operations/${id}`,
    );
    return response.data;
  },

  async updateOperation(
    id: string,
    data: UpdateInvestmentOperationRequest,
  ): Promise<{ message: string; data: InvestmentOperation }> {
    const response = await api.put<{ message: string; data: InvestmentOperation }>(
      `/investments/operations/${id}`,
      data,
    );
    return response.data;
  },

  async deleteOperation(id: string): Promise<void> {
    await api.delete(`/investments/operations/${id}`);
  },

  async getCurrentPosition(): Promise<{ data: Position[] }> {
    const response = await api.get<{ data: Position[] }>('/investments/position');
    return response.data;
  },

  async getMonthlyEvolution(): Promise<{ data: MonthlyEvolution[] }> {
    const response = await api.get<{ data: MonthlyEvolution[] }>(
      '/investments/evolution',
    );
    return response.data;
  },

  async getOperationsByAsset(asset: string): Promise<{ data: InvestmentOperation[] }> {
    const response = await api.get<{ data: InvestmentOperation[] }>(
      `/investments/operations/asset/${encodeURIComponent(asset)}`,
    );
    return response.data;
  },

  async getOperationsByMonth(month: string): Promise<{ data: InvestmentOperation[] }> {
    const response = await api.get<{ data: InvestmentOperation[] }>(
      `/investments/operations/month/${month}`,
    );
    return response.data;
  },
};
