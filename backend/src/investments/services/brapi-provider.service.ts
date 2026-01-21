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
      const token = this.configService.get<string>('BRAPI_TOKEN');
      
      // Se for busca de ações dos EUA, usar lista conhecida e buscar diretamente
      if (group === 'STOCK_USA') {
        return await this.searchUSStocks(search, limit, offset, token);
      }

      // Se for busca de BDRs, usar lista conhecida e buscar diretamente
      if (group === 'BDR') {
        return await this.searchBDRs(search, limit, offset, token);
      }

      const assets: ExternalAssetData[] = [];
      let page = Math.floor(offset / 100) + 1; // brapi usa páginas de 100
      let itemsProcessed = 0;
      let hasNextPage = true;
      const maxPages = search ? 50 : 5; // Se há busca, buscar mais páginas

      // Buscar páginas até ter o suficiente ou não houver mais páginas
      while (itemsProcessed < limit + offset && hasNextPage && page <= maxPages) {
        const url = new URL(`${this.baseUrl}/quote/list`);
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', '100'); // Máximo por página
        if (token) {
          url.searchParams.append('token', token);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          this.logger.warn(`Erro ao buscar página ${page}: HTTP ${response.status}`);
          break;
        }

        const data = await response.json();

        // Processar stocks da página atual
        if (data.stocks && Array.isArray(data.stocks)) {
          for (const stock of data.stocks) {
            const ticker = (stock.stock || stock.symbol || '').toUpperCase();
            const name = (stock.name || '').toLowerCase();
            
            // Aplicar filtro de busca se fornecido
            if (search) {
              const searchLower = search.toLowerCase();
              const tickerLower = ticker.toLowerCase();
              
              if (!tickerLower.includes(searchLower) && !name.includes(searchLower)) {
                continue;
              }
            }

            // Aplicar filtro de grupo se fornecido
            if (group) {
              const stockType = stock.type?.toLowerCase() || '';
              
              // Determinar grupo do asset
              let assetGroup = 'STOCK';
              if (ticker.endsWith('11')) assetGroup = 'FII';
              else if (ticker.endsWith('34')) assetGroup = 'BDR';
              else if (stockType.includes('etf')) assetGroup = 'ETF';
              else if (stockType.includes('fii')) assetGroup = 'FII';
              else if (stockType.includes('bdr')) assetGroup = 'BDR';
              
              // Se o grupo não corresponder, pular
              if (assetGroup !== group) {
                continue;
              }
            }

            // Aplicar offset e limit
            if (itemsProcessed < offset) {
              itemsProcessed++;
              continue;
            }

            if (assets.length >= limit) {
              break;
            }

            assets.push({
              ticker: ticker,
              name: stock.name || ticker,
              companyName: stock.longName || stock.name || ticker,
              sector: stock.sector || undefined,
              subsector: undefined,
              segment: undefined,
              cnpj: undefined,
              market: 'Bovespa',
              logo: stock.logo || stock.logourl || null,
            });

            itemsProcessed++;
          }
        }

        // Verificar se há próxima página
        hasNextPage = data.hasNextPage === true && assets.length < limit;
        page++;

        // Se já temos o suficiente, parar
        if (assets.length >= limit) {
          break;
        }

        // Aguardar um pouco entre páginas para não sobrecarregar a API
        if (hasNextPage && page <= maxPages) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      this.logger.debug(`Busca concluída: ${assets.length} assets encontrados (páginas: ${page - 1})`);
      return assets;
    } catch (error) {
      this.logger.error(`Erro ao buscar assets do brapi.dev: ${error.message}`);
      return [];
    }
  }

  /**
   * Busca ações dos EUA usando lista conhecida e consulta direta na API brapi
   */
  private async searchUSStocks(
    search?: string,
    limit: number = 50,
    offset: number = 0,
    token?: string,
  ): Promise<ExternalAssetData[]> {
    // Lista de ações populares dos EUA
    const usStocks = [
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
      'AMD', 'INTC', 'CSCO', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW', 'PLTR',
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'AXP', 'V', 'MA',
      'UNH', 'JNJ', 'PFE', 'ABBV', 'TMO', 'ABT', 'DHR', 'ISRG', 'REGN', 'GILD',
      'WMT', 'HD', 'MCD', 'SBUX', 'NKE', 'TGT', 'LOW', 'TJX', 'COST', 'BKNG',
      'XOM', 'CVX', 'COP', 'SLB', 'EOG',
      'BA', 'CAT', 'GE', 'HON', 'RTX', 'DE', 'UPS', 'LMT', 'NOC',
      'VZ', 'T', 'CMCSA', 'DIS', 'PARA',
      'LIN', 'APD', 'ECL',
      'NEE', 'DUK', 'SO', 'AEP',
      'AMT', 'PLD', 'EQIX', 'PSA',
      'BRK.B', 'PG', 'PM', 'MO', 'KO', 'PEP', 'AVGO', 'QCOM', 'TXN', 'AMAT',
      'KLAC', 'LRCX', 'ASML', 'SNPS', 'CDNS', 'ANET', 'FTNT', 'CRWD', 'ZS',
      'PANW', 'NET', 'DDOG', 'MDB', 'ESTC', 'DOCN', 'GTLB', 'FROG', 'TEAM',
      'ZM', 'DOCU', 'OKTA', 'SPLK', 'VRNS', 'QLYS', 'RDWR',
    ];

    // Filtrar por busca se fornecido
    let filteredStocks = usStocks;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStocks = usStocks.filter(
        (ticker) => ticker.toLowerCase().includes(searchLower),
      );
    }

    // Aplicar offset e limit
    const paginatedStocks = filteredStocks.slice(offset, offset + limit);
    const assets: ExternalAssetData[] = [];

    // Buscar informações de cada ticker
    for (const ticker of paginatedStocks) {
      try {
        const url = new URL(`${this.baseUrl}/quote/${ticker}`);
        if (token) {
          url.searchParams.append('token', token);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const result = data.results?.[0];

        if (!result) {
          continue;
        }

        assets.push({
          ticker: result.symbol || ticker,
          name: result.longName || result.shortName || ticker,
          companyName: result.longName || result.shortName || ticker,
          sector: undefined,
          subsector: undefined,
          segment: undefined,
          cnpj: undefined,
          market: 'NYSE/NASDAQ',
          logo: result.logourl || result.logo || null,
        });

        // Aguardar um pouco para não sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(`Erro ao buscar ${ticker}: ${error.message}`);
        continue;
      }
    }

    return assets;
  }

  /**
   * Busca BDRs usando lista conhecida e consulta direta na API brapi
   */
  private async searchBDRs(
    search?: string,
    limit: number = 50,
    offset: number = 0,
    token?: string,
  ): Promise<ExternalAssetData[]> {
    // Lista de BDRs populares negociados na B3
    const bdrs = [
      // Tech
      'AAPL34', 'MSFT34', 'GOOGL34', 'GOOG34', 'AMZN34', 'META34', 'TSLA34',
      'NVDA34', 'NFLX34', 'AMD34', 'INTC34', 'CSCO34', 'ORCL34', 'CRM34',
      'ADBE34', 'NOW34', 'SNOW34', 'PLTR34',
      // Finance
      'JPM34', 'BAC34', 'WFC34', 'GS34', 'MS34', 'C34', 'BLK34', 'SCHW34',
      'AXP34', 'V34', 'MA34',
      // Healthcare
      'UNH34', 'JNJ34', 'PFE34', 'ABBV34', 'TMO34', 'ABT34', 'DHR34',
      'ISRG34', 'REGN34', 'GILD34',
      // Consumer
      'WMT34', 'HD34', 'MCD34', 'SBUX34', 'NKE34', 'TGT34', 'LOW34',
      'TJX34', 'COST34', 'BKNG34',
      // Energy
      'XOM34', 'CVX34', 'COP34', 'SLB34', 'EOG34',
      // Industrial
      'BA34', 'CAT34', 'GE34', 'HON34', 'RTX34', 'DE34', 'UPS34', 'LMT34',
      'NOC34',
      // Communication
      'VZ34', 'T34', 'CMCSA34', 'DIS34', 'PARA34',
      // Materials
      'LIN34', 'APD34', 'ECL34',
      // Utilities
      'NEE34', 'DUK34', 'SO34', 'AEP34',
      // Real Estate
      'AMT34', 'PLD34', 'EQIX34', 'PSA34',
      // Others
      'BRK34', 'PG34', 'PM34', 'MO34', 'KO34', 'PEP34', 'AVGO34', 'QCOM34',
      'TXN34', 'AMAT34', 'KLAC34', 'LRCX34', 'ASML34', 'SNPS34', 'CDNS34',
      'ANET34', 'FTNT34', 'CRWD34', 'ZS34', 'PANW34', 'NET34', 'DDOG34',
      'MDB34', 'ESTC34', 'DOCN34', 'GTLB34', 'FROG34', 'TEAM34', 'ZM34',
      'DOCU34', 'OKTA34', 'SPLK34', 'VRNS34', 'QLYS34', 'RDWR34',
      // BDRs com outros sufixos conhecidos
      'COCA34', 'PEPB34', 'MELI34', 'ITLC34',
    ];

    // Filtrar por busca se fornecido
    let filteredBDRs = bdrs;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredBDRs = bdrs.filter(
        (ticker) => ticker.toLowerCase().includes(searchLower),
      );
    }

    // Aplicar offset e limit
    const paginatedBDRs = filteredBDRs.slice(offset, offset + limit);
    const assets: ExternalAssetData[] = [];

    // Buscar informações de cada BDR
    for (const ticker of paginatedBDRs) {
      try {
        const url = new URL(`${this.baseUrl}/quote/${ticker}`);
        if (token) {
          url.searchParams.append('token', token);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const result = data.results?.[0];

        if (!result) {
          continue;
        }

        assets.push({
          ticker: result.symbol || ticker,
          name: result.longName || result.shortName || ticker,
          companyName: result.longName || result.shortName || ticker,
          sector: undefined,
          subsector: undefined,
          segment: undefined,
          cnpj: undefined,
          market: 'Bovespa',
          logo: result.logourl || result.logo || null,
        });

        // Aguardar um pouco para não sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(`Erro ao buscar ${ticker}: ${error.message}`);
        continue;
      }
    }

    return assets;
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
