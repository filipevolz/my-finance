import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../asset.entity';
import { ExternalAssetsService } from './external-assets.service';
import { AssetMapper } from '../mappers/asset.mapper';

/**
 * Serviço responsável por sincronizar assets de APIs externas para o banco de dados
 */
@Injectable()
export class AssetSyncService {
  private readonly logger = new Logger(AssetSyncService.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
    private readonly externalAssetsService: ExternalAssetsService,
  ) {}

  /**
   * Sincroniza assets de uma API externa para o banco de dados
   * @param group Grupo de assets a sincronizar (STOCK, ETF, etc)
   * @param limit Limite de assets por requisição
   * @returns Número de assets sincronizados
   */
  async syncAssetsFromExternalAPI(
    group: string = 'STOCK',
    limit: number = 100,
  ): Promise<number> {
    try {
      this.logger.log(`Iniciando sincronização de assets do grupo: ${group}`);

      let totalSynced = 0;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // Buscar assets da API externa
        const assets = await this.externalAssetsService.searchAssets(
          undefined, // sem busca específica
          group,
          limit,
          offset,
        );

        if (assets.length === 0) {
          hasMore = false;
          break;
        }

        // Salvar cada asset no banco
        for (const myProfitAsset of assets) {
          const ticker = myProfitAsset.Ticker?.trim();
          if (!ticker) {
            continue;
          }

          // Verificar se já existe
          const existing = await this.assetRepository.findOne({
            where: { ticker },
          });

          if (existing) {
            // Atualizar asset existente
            existing.assetName = myProfitAsset.AssetName || existing.assetName;
            existing.alias = myProfitAsset.Alias || ticker;
            existing.pic = myProfitAsset.Pic || existing.pic; // Atualizar logo se disponível
            existing.sector = myProfitAsset.Sector || existing.sector;
            existing.subSector = myProfitAsset.SubSector || existing.subSector;
            existing.segment = myProfitAsset.Segment || existing.segment;
            existing.assetType = myProfitAsset.AssetType || existing.assetType;
            existing.cnpj = myProfitAsset.CNPJ || existing.cnpj;
            existing.legalName = myProfitAsset.LegalName || existing.legalName;
            existing.marketString = myProfitAsset.MarketString || existing.marketString;
            existing.category = myProfitAsset.Category || existing.category;
            existing.assetGroup = myProfitAsset.AssetGroup || existing.assetGroup;

            await this.assetRepository.save(existing);
            this.logger.debug(`Asset atualizado: ${ticker}`);
          } else {
            // Criar novo asset
            const asset = this.assetRepository.create({
              assetName: myProfitAsset.AssetName || ticker,
              ticker,
              alias: myProfitAsset.Alias || ticker,
              tickerRef: myProfitAsset.TickerRef || null,
              pic: myProfitAsset.Pic || null,
              sector: myProfitAsset.Sector || null,
              subSector: myProfitAsset.SubSector || null,
              typeTax: myProfitAsset.TypeTax || null,
              dueDate: myProfitAsset.DueDate
                ? new Date(myProfitAsset.DueDate)
                : null,
              index: myProfitAsset.Index || null,
              tax: myProfitAsset.Tax || 0,
              segment: myProfitAsset.Segment || null,
              assetType: myProfitAsset.AssetType || null,
              cnpj: myProfitAsset.CNPJ || null,
              cnpjAdmin: myProfitAsset.CNPJAdmin || null,
              administrator: myProfitAsset.Administrator || null,
              legalName: myProfitAsset.LegalName || null,
              codeAPI: myProfitAsset.CodeAPI || null,
              exceptions: myProfitAsset.Exceptions || null,
              market: myProfitAsset.Market || 0,
              marketString: myProfitAsset.MarketString || 'Bovespa',
              category: myProfitAsset.Category || null,
              exemption: myProfitAsset.Exemption || false,
              assetGroup: myProfitAsset.AssetGroup || group,
              assetSeries: myProfitAsset.AssetSeries || null,
            });

            await this.assetRepository.save(asset);
            totalSynced++;
            this.logger.debug(`Novo asset criado: ${ticker}`);
          }
        }

        // Se retornou menos que o limite, não há mais dados
        if (assets.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }

        // Log de progresso
        this.logger.log(
          `Sincronizados ${totalSynced} assets até agora (offset: ${offset})`,
        );
      }

      this.logger.log(
        `Sincronização concluída. Total de novos assets: ${totalSynced}`,
      );

      return totalSynced;
    } catch (error) {
      this.logger.error(`Erro ao sincronizar assets: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Sincroniza assets específicos por busca
   */
  async syncAssetsBySearch(
    search: string,
    group: string = 'STOCK',
  ): Promise<number> {
    try {
      this.logger.log(`Sincronizando assets com busca: ${search}`);

      const assets = await this.externalAssetsService.searchAssets(
        search,
        group,
        100, // limit
        0, // offset
      );

      let synced = 0;

      for (const myProfitAsset of assets) {
        const ticker = myProfitAsset.Ticker?.trim();
        if (!ticker) continue;

        const existing = await this.assetRepository.findOne({
          where: { ticker },
        });

        if (!existing) {
          const asset = this.assetRepository.create({
            assetName: myProfitAsset.AssetName || ticker,
            ticker,
            alias: myProfitAsset.Alias || ticker,
            sector: myProfitAsset.Sector || null,
            subSector: myProfitAsset.SubSector || null,
            segment: myProfitAsset.Segment || null,
            assetType: myProfitAsset.AssetType || null,
            cnpj: myProfitAsset.CNPJ || null,
            legalName: myProfitAsset.LegalName || null,
            marketString: myProfitAsset.MarketString || 'Bovespa',
            category: myProfitAsset.Category || null,
            assetGroup: myProfitAsset.AssetGroup || group,
            tax: myProfitAsset.Tax || 0,
            market: myProfitAsset.Market || 0,
            exemption: myProfitAsset.Exemption || false,
          });

          await this.assetRepository.save(asset);
          synced++;
        }
      }

      this.logger.log(`Sincronizados ${synced} novos assets`);
      return synced;
    } catch (error) {
      this.logger.error(`Erro ao sincronizar por busca: ${error.message}`);
      throw error;
    }
  }
}
