import { api } from './api';

export type CategoryType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  data: Category[];
}

export const categoriesService = {
  async findAll(type?: CategoryType): Promise<CategoriesResponse> {
    const params = type ? { type } : {};
    const response = await api.get<CategoriesResponse>('/categories', {
      params,
    });
    return response.data;
  },
};
