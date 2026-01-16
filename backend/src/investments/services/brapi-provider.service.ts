import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAssetProvider } from './external-assets.service';
import { ExternalAssetData } from '../mappers/asset.mapper';

/**
 * Provedor usando brapi.dev - API pública brasileira de dados financeiros
 * https://brapi.dev/
 * 
 * Esta API fornece lista de tickers e informações básicas sobre ações brasileiras
 */
@Injectable()
export class BrapiProvider implements IAssetProvider {
  private readonly logger = new Logger(BrapiProvider.name);
  private readonly baseUrl = 'https://brapi.dev/api';

  constructor(private readonly configService: ConfigService) {}

  async searchAssets(
    search?: string,
    group?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ExternalAssetData[]> {
    try {
      // brapi.dev não tem endpoint direto de lista de tickers
      // Vamos usar uma lista estática conhecida de tickers da B3
      // ou buscar via cotações disponíveis
      
      // Alternativa: usar lista de tickers conhecidos da B3
      // Por enquanto, vamos retornar uma lista básica de ações populares
      // Em produção, você pode usar uma API que forneça lista completa
      
      const url = new URL(`${this.baseUrl}/quote/list`);
      
      // brapi.dev permite buscar cotações, mas não lista completa de tickers
      // Vamos implementar uma busca alternativa usando lista conhecida
      
      // Lista de tickers populares da B3 (exemplo)
      const popularTickers = this.getPopularTickers();
      
      // Filtrar por busca se fornecido
      let filteredTickers = popularTickers;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredTickers = popularTickers.filter(
          (ticker) => ticker.toLowerCase().includes(searchLower),
        );
      }
      
      // Aplicar paginação
      const paginatedTickers = filteredTickers.slice(offset, offset + limit);
      
      // Buscar informações detalhadas de cada ticker
      const assets: ExternalAssetData[] = [];
      
      // Limitar requisições para não sobrecarregar a API
      const batchSize = 10;
      for (let i = 0; i < Math.min(paginatedTickers.length, batchSize); i++) {
        const ticker = paginatedTickers[i];
        try {
          const assetInfo = await this.fetchAssetInfo(ticker);
          if (assetInfo) {
            assets.push(assetInfo);
          }
        } catch (error) {
          this.logger.warn(`Erro ao buscar info do ticker ${ticker}: ${error.message}`);
          // Continuar mesmo se um ticker falhar
        }
      }
      
      return assets;
    } catch (error) {
      this.logger.error(`Erro ao buscar assets do brapi.dev: ${error.message}`);
      return [];
    }
  }

  /**
   * Busca informações detalhadas de um ticker específico
   */
  private async fetchAssetInfo(ticker: string): Promise<ExternalAssetData | null> {
    try {
      const url = new URL(`${this.baseUrl}/quote/${ticker}`);
      url.searchParams.append('token', this.configService.get<string>('BRAPI_TOKEN') || '');
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const result = data.results?.[0];
      
      if (!result) {
        return null;
      }

      return {
        ticker: result.symbol || ticker,
        name: result.longName || result.shortName || ticker,
        companyName: result.longName || result.shortName || ticker,
        sector: undefined, // brapi.dev não fornece setor diretamente
        subsector: undefined,
        segment: undefined,
        cnpj: undefined,
        market: 'Bovespa',
        logo: result.logo || null, // URL do logo da brapi (ex: https://icons.brapi.dev/icons/PETR4.svg)
      };
    } catch (error) {
      this.logger.warn(`Erro ao buscar info do ticker ${ticker}: ${error.message}`);
      return null;
    }
  }

  /**
   * Retorna lista de tickers populares da B3
   * Em produção, isso pode vir de um arquivo JSON ou outra fonte
   */
  private getPopularTickers(): string[] {
    return [
      'PETR4', 'VALE3', 'ITUB4', 'BBDC4', 'ABEV3', 'WEGE3', 'MGLU3', 'RENT3',
      'SUZB3', 'CMIG4', 'BBAS3', 'ELET3', 'ELET6', 'USIM5', 'GGBR4', 'CSAN3',
      'BRAP4', 'RADL3', 'CCRO3', 'CYRE3', 'HAPV3', 'EGIE3', 'BRKM5', 'KLBN11',
      'QUAL3', 'TIMS3', 'VIVT3', 'TOTS3', 'RAIL3', 'SBSP3', 'CPLE6', 'CPFE3',
      'ELET6', 'GOAU4', 'CSNA3', 'PRIO3', 'UGPA3', 'DXCO3', 'LWSA3', 'RDOR3',
      'MRVE3', 'CAML3', 'ARZZ3', 'JHSF3', 'CURY3', 'DIRR3', 'YDUQ3', 'ALPA4',
      'BRML3', 'JALL3', 'MULT3', 'GUAR3', 'SOMA3', 'ENEV3', 'AERI3', 'AURE3',
    ];
  }

  /**
   * Busca lista completa de tickers disponíveis
   * Pode ser usado para sincronização completa
   */
  async getAllAvailableTickers(): Promise<string[]> {
    // Esta é uma lista básica. Em produção, você pode:
    // 1. Usar uma API que forneça lista completa
    // 2. Fazer scraping da B3 (com cuidado legal)
    // 3. Usar um arquivo JSON atualizado periodicamente
    
    return this.getPopularTickers();
  }
}
