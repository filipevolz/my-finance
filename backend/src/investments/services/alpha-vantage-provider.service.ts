import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAssetProvider } from './external-assets.service';
import { ExternalAssetData } from '../mappers/asset.mapper';

/**
 * Provedor usando Alpha Vantage (suporta ações brasileiras)
 * https://www.alphavantage.co/
 * 
 * Requer API key (gratuita disponível)
 */
@Injectable()
export class AlphaVantageProvider implements IAssetProvider {
  private readonly logger = new Logger(AlphaVantageProvider.name);
  private readonly baseUrl = 'https://www.alphavantage.co/query';

  constructor(private readonly configService: ConfigService) {}

  async searchAssets(
    search?: string,
    group?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ExternalAssetData[]> {
    try {
      const apiKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY');
      
      if (!apiKey) {
        this.logger.warn('ALPHA_VANTAGE_API_KEY não configurada');
        return [];
      }

      // Alpha Vantage não tem endpoint direto de lista
      // Vamos usar uma lista conhecida e buscar informações
      const tickers = this.getBrazilianTickers();
      
      let filteredTickers = tickers;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredTickers = tickers.filter(
          (ticker) => ticker.toLowerCase().includes(searchLower),
        );
      }
      
      const paginatedTickers = filteredTickers.slice(offset, offset + limit);
      const assets: ExternalAssetData[] = [];
      
      // Limitar requisições (Alpha Vantage tem limite de 5 req/min no plano free)
      const batchSize = 5;
      for (let i = 0; i < Math.min(paginatedTickers.length, batchSize); i++) {
        const ticker = paginatedTickers[i];
        try {
          // Adicionar .SA para ações brasileiras no Alpha Vantage
          const assetInfo = await this.fetchAssetInfo(`${ticker}.SA`, apiKey);
          if (assetInfo) {
            assets.push(assetInfo);
          }
          // Aguardar para respeitar rate limit
          await this.delay(12000); // 12 segundos entre requisições
        } catch (error) {
          this.logger.warn(`Erro ao buscar ${ticker}: ${error.message}`);
        }
      }
      
      return assets;
    } catch (error) {
      this.logger.error(`Erro ao buscar assets do Alpha Vantage: ${error.message}`);
      return [];
    }
  }

  private async fetchAssetInfo(
    ticker: string,
    apiKey: string,
  ): Promise<ExternalAssetData | null> {
    try {
      const url = new URL(this.baseUrl);
      url.searchParams.append('function', 'OVERVIEW');
      url.searchParams.append('symbol', ticker);
      url.searchParams.append('apikey', apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      // Alpha Vantage retorna "Error Message" em caso de erro
      if (data['Error Message'] || data['Note']) {
        return null;
      }

      return {
        ticker: ticker.replace('.SA', ''), // Remover sufixo .SA
        name: data.Name || ticker,
        companyName: data.Name || ticker,
        sector: data.Sector || undefined,
        subsector: undefined,
        segment: data.Industry || undefined,
        cnpj: undefined,
        market: 'Bovespa',
      };
    } catch (error) {
      return null;
    }
  }

  private getBrazilianTickers(): string[] {
    return [
      'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'MGLU3', 'RENT3',
      'SUZB3', 'CMIG4', 'BBAS3', 'ELET3', 'ELET6', 'USIM5', 'GGBR4', 'CSAN3',
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
