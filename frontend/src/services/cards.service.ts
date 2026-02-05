import { api } from './api';

export interface CreateCardRequest {
  nickname: string;
  lastFourDigits?: string | null;
  dueDate: number;
  totalLimit: number;
  closingDate: number;
  isDefault?: boolean;
}

export interface UpdateCardRequest {
  nickname?: string;
  lastFourDigits?: string | null;
  dueDate?: number;
  totalLimit?: number;
  usedLimit?: number;
  closingDate?: number;
  isDefault?: boolean;
}

export interface Card {
  id: string;
  userId: string;
  nickname: string;
  lastFourDigits: string | null;
  dueDate: number;
  totalLimit: number | null;
  usedLimit: number;
  availableLimit: number | null; // Calculado: totalLimit - usedLimit
  closingDate: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CardsResponse {
  data: Card[];
}

export interface CardResponse {
  data: Card;
}

export interface CreateCardResponse {
  message: string;
  data: Card;
}

export interface UpdateCardResponse {
  message: string;
  data: Card;
}

export const cardsService = {
  async create(data: CreateCardRequest): Promise<CreateCardResponse> {
    const response = await api.post<CreateCardResponse>('/cards', data);
    return response.data;
  },

  async findAll(): Promise<CardsResponse> {
    const response = await api.get<CardsResponse>('/cards');
    return response.data;
  },

  async findOne(id: string): Promise<CardResponse> {
    const response = await api.get<CardResponse>(`/cards/${id}`);
    return response.data;
  },

  async findDefault(): Promise<CardResponse> {
    const response = await api.get<CardResponse>('/cards/default');
    return response.data;
  },

  async update(
    id: string,
    data: UpdateCardRequest,
  ): Promise<UpdateCardResponse> {
    const response = await api.put<UpdateCardResponse>(`/cards/${id}`, data);
    return response.data;
  },

  async setAsDefault(id: string): Promise<UpdateCardResponse> {
    const response = await api.patch<UpdateCardResponse>(
      `/cards/${id}/set-default`,
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/cards/${id}`);
  },

  async recalculateAllLimits(): Promise<CardsResponse> {
    const response = await api.post<CardsResponse>('/cards/recalculate-limits');
    return response.data;
  },
};
