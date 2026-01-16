import * as fs from 'fs';
import * as path from 'path';
import { Asset } from './asset.entity';

export async function loadAssetsSeed(): Promise<Partial<Asset>[]> {
  try {
    const jsonPath = path.join(process.cwd(), 'assets.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const assets = JSON.parse(jsonData);

    return assets.map((asset: any) => {
      // Converter data se existir
      let dueDate: Date | null = null;
      if (asset.DueDate) {
        dueDate = new Date(asset.DueDate);
      }

      return {
        assetName: asset.AssetName?.trim() || '',
        ticker: asset.Ticker?.trim() || '',
        alias: asset.Alias?.trim() || null,
        tickerRef: asset.TickerRef?.trim() || null,
        pic: asset.Pic?.trim() || null,
        sector: asset.Sector?.trim() || null,
        subSector: asset.SubSector?.trim() || null,
        typeTax: asset.TypeTax?.trim() || null,
        dueDate,
        index: asset.Index?.trim() || null,
        tax: asset.Tax || 0,
        segment: asset.Segment?.trim() || null,
        assetType: asset.AssetType?.trim() || null,
        cnpj: asset.CNPJ?.trim() || null,
        cnpjAdmin: asset.CNPJAdmin?.trim() || null,
        administrator: asset.Administrator?.trim() || null,
        legalName: asset.LegalName?.trim() || null,
        codeAPI: asset.CodeAPI || null,
        exceptions: asset.Exceptions?.trim() || null,
        market: asset.Market || 0,
        marketString: asset.MarketString?.trim() || null,
        category: asset.Category?.trim() || null,
        exemption: asset.Exemption || false,
        assetGroup: asset.AssetGroup?.trim() || 'STOCK',
        assetSeries: asset.AssetSeries?.trim() || null,
      };
    });
  } catch (error) {
    console.error('Erro ao carregar seed de assets:', error);
    return [];
  }
}
