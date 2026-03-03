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

export interface AssetType {
  id: number;
  assetGroup: string;
  groupName: string;
  category: string;
  categoryName: string;
  assetGroupIRRF: string;
  exemption: boolean;
  feePercent: number;
  exemptionValue: number;
}

export interface Exchange {
  id: number;
  exchangeName: string;
  category: string;
  currency: string;
  participantName: string | null;
  nameEnum: string | null;
  cnpj: string | null;
  code: string | null;
  countryCode: string | null;
  url: string | null;
}

export interface Asset {
  id: number;
  assetName: string;
  ticker: string;
  alias: string | null;
  tickerRef: string | null;
  pic: string | null;
  sector: string | null;
  subSector: string | null;
  typeTax: string | null;
  dueDate: string | null;
  index: string | null;
  tax: number;
  segment: string | null;
  assetType: string | null;
  cnpj: string | null;
  cnpjAdmin: string | null;
  administrator: string | null;
  legalName: string | null;
  codeAPI: number | null;
  exceptions: string | null;
  market: number;
  marketString: string | null;
  category: string | null;
  exemption: boolean;
  assetGroup: string;
  assetSeries: string | null;
  createdAt: string;
  updatedAt: string;
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

  async getAssetTypes(): Promise<{ data: AssetType[] }> {
    const response = await api.get<{ data: AssetType[] }>('/investments/asset-types');
    return response.data;
  },

  async getExchanges(): Promise<{ data: Exchange[] }> {
    const response = await api.get<{ data: Exchange[] }>('/investments/exchanges');
    return response.data;
  },

  async searchAssets(
    search?: string,
    assetGroup?: string,
    limit?: number,
  ): Promise<{ data: Asset[] }> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (assetGroup) params.append('assetGroup', assetGroup);
    if (limit) params.append('limit', limit.toString());

    const response = await api.get<{ data: Asset[] }>(
      `/investments/assets?${params.toString()}`,
    );
    return response.data;
  },

  async getAssetByTicker(ticker: string): Promise<{ data: Asset | null }> {
    const response = await api.get<{ data: Asset | null }>(
      `/investments/assets/ticker/${encodeURIComponent(ticker)}`,
    );
    return response.data;
  },

  async syncAssets(group?: string): Promise<{ message: string; synced: number }> {
    const params = new URLSearchParams();
    if (group) params.append('group', group);

    const response = await api.get<{ message: string; synced: number }>(
      `/investments/assets/sync?${params.toString()}`,
    );
    return response.data;
  },
};
