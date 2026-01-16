import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../asset.entity';
import { IAssetProvider } from './external-assets.service';
import { ExternalAssetData } from '../mappers/asset.mapper';

/**
 * Provedor que usa o banco de dados local como fonte de dados
 * Útil quando já temos assets populados no banco
 */
@Injectable()
export class DatabaseAssetProvider implements IAssetProvider {
  private readonly logger = new Logger(DatabaseAssetProvider.name);

  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  async searchAssets(
    search?: string,
    group?: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ExternalAssetData[]> {
    try {
      const query = this.assetRepository.createQueryBuilder('asset');

      // Filtrar por grupo se fornecido
      if (group) {
        query.where('asset.assetGroup = :group', { group });
      }

      // Filtrar por busca se fornecido
      if (search) {
        const searchLower = search.toLowerCase();
        query.andWhere(
          '(LOWER(asset.ticker) LIKE :search OR LOWER(asset.assetName) LIKE :search)',
          { search: `%${searchLower}%` },
        );
      }

      // Ordenar e paginar
      query
        .orderBy('asset.assetName', 'ASC')
        .skip(offset)
        .take(limit);

      const assets = await query.getMany();

      // Converter para formato genérico
      return assets.map((asset) => ({
        ticker: asset.ticker,
        name: asset.assetName,
        companyName: asset.legalName || asset.assetName,
        sector: asset.sector || undefined,
        subsector: asset.subSector || undefined,
        segment: asset.segment || undefined,
        cnpj: asset.cnpj || undefined,
        market: asset.marketString || 'Bovespa',
        assetType: asset.assetType || undefined,
      }));
    } catch (error) {
      this.logger.error(`Erro ao buscar assets do banco: ${error.message}`);
      return [];
    }
  }
}
