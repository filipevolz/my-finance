import { api } from './api';

export interface ImportBankStatementResponse {
  message: string;
  data: {
    expensesCreated: number;
    incomesCreated: number;
    errors?: string[];
  };
}

export const bankStatementService = {
  async importFromPdf(file: File): Promise<ImportBankStatementResponse> {
    if (!file || !(file instanceof File)) {
      throw new Error('Arquivo PDF é obrigatório.');
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportBankStatementResponse>(
      '/bank-statement/import-from-pdf',
      formData,
    );
    return response.data;
  },
};
