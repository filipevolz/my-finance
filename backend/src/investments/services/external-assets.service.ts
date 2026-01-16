import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetMapper, ExternalAssetData, MyProfitAssetFormat } from '../mappers/asset.mapper';
import { DatabaseAssetProvider } from './database-asset-provider.service';
import { BrapiProvider } from './brapi-provider.service';
import { AlphaVantageProvider } from './alpha-vantage-provider.service';

/**
 * Interface para provedores de dados de ativos
 * Permite fácil troca de API no futuro
 */
export interface IAssetProvider {
  searchAssets(
    search?: string,
    group?: string,
    limit?: number,
    offset?: number,
  ): Promise<ExternalAssetData[]>;
}

/**
 * Provedor usando Dados de Mercado API
 * https://api.dadosdemercado.com.br
 */
@Injectable()
export class DadosMercadoProvider implements IAssetProvider {
  private readonly logger = new Logger(DadosMercadoProvider.name);
  private readonly baseUrl = 'https://api.dadosdemercado.com.br';

  async searchAssets(
    search?: string,
    group?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ExternalAssetData[]> {
    try {
      // Nota: A API real do Dados de Mercado pode ter endpoints diferentes
      // Este é um exemplo de implementação que precisa ser ajustado conforme a documentação real
      const url = new URL(`${this.baseUrl}/v1/ativos`);
      
      if (search) {
        url.searchParams.append('search', search);
      }
      if (limit) {
        url.searchParams.append('limit', limit.toString());
      }
      if (offset) {
        url.searchParams.append('offset', offset.toString());
      }

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Mapear resposta da API para nosso formato genérico
      // Ajustar conforme a estrutura real da API
      return (data.data || data || []).map((item: any) => ({
        ticker: item.ticker || item.symbol,
        name: item.name || item.companyName,
        companyName: item.companyName || item.name,
        sector: item.sector,
        subsector: item.subsector,
        segment: item.segment,
        cnpj: item.cnpj,
        market: item.market || 'Bovespa',
      }));
    } catch (error) {
      this.logger.error(`Erro ao buscar assets do Dados de Mercado: ${error.message}`);
      // Retornar array vazio em caso de erro para não quebrar a aplicação
      return [];
    }
  }
}

/**
 * Provedor usando B3 API (alternativa)
 * Pode ser usado como fallback ou principal
 */
@Injectable()
export class B3Provider implements IAssetProvider {
  private readonly logger = new Logger(B3Provider.name);
  private readonly baseUrl = 'https://sistemaswebb3-listados.b3.com.br';

  async searchAssets(
    search?: string,
    group?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ExternalAssetData[]> {
    try {
      // Exemplo de implementação - ajustar conforme API real da B3
      // A B3 tem APIs públicas mas podem requerer autenticação ou ter formatos específicos
      
      // Por enquanto, retornar array vazio
      // Implementar quando tiver acesso à API real
      this.logger.warn('B3Provider não implementado ainda');
      return [];
    } catch (error) {
      this.logger.error(`Erro ao buscar assets da B3: ${error.message}`);
      return [];
    }
  }
}

/**
 * Serviço principal que gerencia provedores de assets
 */
@Injectable()
export class ExternalAssetsService {
  private readonly logger = new Logger(ExternalAssetsService.name);
  private currentProvider: IAssetProvider;

  constructor(
    private readonly databaseProvider: DatabaseAssetProvider,
    private readonly dadosMercadoProvider: DadosMercadoProvider,
    private readonly b3Provider: B3Provider,
    private readonly brapiProvider: BrapiProvider,
    private readonly alphaVantageProvider: AlphaVantageProvider,
    private readonly configService: ConfigService,
  ) {
    // Selecionar provedor baseado em variável de ambiente
    const providerType = this.configService.get<string>('ASSET_PROVIDER', 'DATABASE');
    
    switch (providerType.toUpperCase()) {
      case 'B3':
        this.currentProvider = b3Provider;
        break;
      case 'DADOS_MERCADO':
        this.currentProvider = dadosMercadoProvider;
        break;
      case 'BRAPI':
        this.currentProvider = brapiProvider;
        break;
      case 'ALPHA_VANTAGE':
        this.currentProvider = alphaVantageProvider;
        break;
      case 'DATABASE':
      default:
        this.currentProvider = databaseProvider;
        break;
    }

    this.logger.log(`Usando provedor de assets: ${providerType}`);
  }

  /**
   * Busca assets no formato MyProfit
   */
  async searchAssets(
    assetSearch?: string,
    group: string = 'STOCK',
    limit: number = 50,
    offset: number = 0,
  ): Promise<MyProfitAssetFormat[]> {
    try {
      // Buscar dados do provedor atual
      const externalData = await this.currentProvider.searchAssets(
        assetSearch,
        group,
        limit,
        offset,
      );

      // Filtrar por grupo se necessário
      let filteredData = externalData;
      if (group && group !== 'STOCK') {
        // Implementar filtro por grupo se necessário
        filteredData = externalData;
      }

      // Filtrar por busca se fornecido
      if (assetSearch) {
        const searchLower = assetSearch.toLowerCase();
        filteredData = filteredData.filter(
          (asset) =>
            asset.ticker?.toLowerCase().includes(searchLower) ||
            asset.name?.toLowerCase().includes(searchLower) ||
            asset.companyName?.toLowerCase().includes(searchLower),
        );
      }

      // Mapear para formato MyProfit
      // IDs começam do offset + 1 para manter consistência na paginação
      return AssetMapper.mapArray(filteredData, group, offset + 1);
    } catch (error) {
      this.logger.error(`Erro ao buscar assets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Permite trocar o provedor em runtime (útil para testes ou fallback)
   */
  setProvider(provider: IAssetProvider): void {
    this.currentProvider = provider;
    this.logger.log('Provedor de assets alterado');
  }
}
