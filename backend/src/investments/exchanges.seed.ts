import * as fs from 'fs';
import * as path from 'path';
import { Exchange } from './exchange.entity';

export async function loadExchangesSeed(): Promise<Partial<Exchange>[]> {
  try {
    // Caminho relativo ao diretório raiz do projeto (funciona tanto em dev quanto em build)
    const jsonPath = path.join(process.cwd(), 'exchanges.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const exchanges = JSON.parse(jsonData);

    return exchanges.map((ex: any) => ({
      exchangeName: ex.ExchangeName?.trim() || '',
      category: ex.Category || '',
      currency: ex.Currency || 'BRL',
      participantName: ex.ParticipantName || null,
      nameEnum: ex.NameEnum || null,
      cnpj: ex.CNPJ || null,
      code: ex.Code || null,
      countryCode: ex.CountryCode || null,
      url: ex.URL || null,
    }));
  } catch (error) {
    console.error('Erro ao carregar seed de exchanges:', error);
    return [];
  }
}
