/**
 * Mapper para converter dados de APIs externas para o formato compatível com MyProfit
 */

export interface ExternalAssetData {
  // Formato genérico que pode vir de diferentes APIs
  ticker?: string;
  name?: string;
  companyName?: string;
  sector?: string;
  subsector?: string;
  segment?: string;
  cnpj?: string;
  market?: string;
  logo?: string; // URL do logo do ativo
  [key: string]: any; // Permite campos adicionais
}

export interface MyProfitAssetFormat {
  ID: number;
  AssetName: string;
  Ticker: string;
  Alias: string;
  TickerRef: string;
  Pic: string | null;
  Sector: string | null;
  SubSector: string | null;
  TypeTax: string | null;
  DueDate: string | null;
  Index: string | null;
  Tax: number;
  Segment: string | null;
  AssetType: string | null;
  CNPJ: string | null;
  CNPJAdmin: string | null;
  Administrator: string | null;
  LegalName: string | null;
  CodeAPI: number | null;
  Exceptions: string | null;
  Market: number;
  MarketString: string | null;
  Category: string | null;
  Exemption: boolean;
  AssetGroup: string;
  AssetSeries: string | null;
}

/**
 * Mapeia dados externos para o formato MyProfit
 */
export class AssetMapper {
  /**
   * Converte dados de uma API externa para o formato MyProfit
   * @param externalData Dados da API externa
   * @param assetGroup Grupo do ativo (STOCK, ETF, etc)
   * @param id ID único para o asset (gerado externamente)
   */
  static toMyProfitFormat(
    externalData: ExternalAssetData,
    assetGroup: string = 'STOCK',
    id: number = 1,
  ): MyProfitAssetFormat {
    const ticker = externalData.ticker || '';
    const assetName = externalData.name || externalData.companyName || ticker;

    return {
      ID: id,
      AssetName: assetName,
      Ticker: ticker,
      Alias: ticker, // Alias igual ao Ticker conforme requisito
      TickerRef: '',
      Pic: externalData.logo || null, // URL do logo da brapi
      Sector: externalData.sector || null,
      SubSector: externalData.subsector || null,
      TypeTax: null,
      DueDate: null,
      Index: null,
      Tax: 0,
      Segment: externalData.segment || null,
      AssetType: null, // Será determinado pelo ticker (ON, PN, etc)
      CNPJ: externalData.cnpj || null,
      CNPJAdmin: null,
      Administrator: null,
      LegalName: externalData.companyName || assetName || null,
      CodeAPI: null,
      Exceptions: null,
      Market: 0,
      MarketString: 'Bovespa',
      Category: null,
      Exemption: false,
      AssetGroup: assetGroup,
      AssetSeries: null,
    };
  }

  /**
   * Extrai o tipo de ativo do ticker (ON, PN, UNT, etc)
   */
  static extractAssetType(ticker: string): string | null {
    if (!ticker) return null;

    // Padrão brasileiro: ticker termina com número
    const match = ticker.match(/(\d+)$/);
    if (!match) return null;

    const suffix = match[1];
    if (suffix.length === 1) {
      // 3 = ON, 4 = PN, 5 = PNA, 6 = PNB, 11 = UNT
      const typeMap: { [key: string]: string } = {
        '3': 'ON',
        '4': 'PN',
        '5': 'PNA',
        '6': 'PNB',
      };
      return typeMap[suffix] || null;
    } else if (suffix === '11') {
      return 'UNT';
    }

    return null;
  }

  /**
   * Aplica o tipo de ativo extraído do ticker
   */
  static applyAssetType(asset: MyProfitAssetFormat): MyProfitAssetFormat {
    const assetType = this.extractAssetType(asset.Ticker);
    return {
      ...asset,
      AssetType: assetType,
    };
  }

  /**
   * Mapeia um array de dados externos
   */
  static mapArray(
    externalDataArray: ExternalAssetData[],
    assetGroup: string = 'STOCK',
    startId: number = 1,
  ): MyProfitAssetFormat[] {
    return externalDataArray
      .map((data, index) =>
        this.toMyProfitFormat(data, assetGroup, startId + index),
      )
      .map((asset) => this.applyAssetType(asset));
  }
}
