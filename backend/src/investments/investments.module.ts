import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { InvestmentOperation } from './investment-operation.entity';
import { AssetType } from './asset-type.entity';
import { Exchange } from './exchange.entity';
import { Asset } from './asset.entity';
import { assetTypesSeed } from './asset-types.seed';
import { loadExchangesSeed } from './exchanges.seed';
import { loadAssetsSeed } from './assets.seed';
import {
  ExternalAssetsService,
  DadosMercadoProvider,
  B3Provider,
} from './services/external-assets.service';
import { DatabaseAssetProvider } from './services/database-asset-provider.service';
import { BrapiProvider } from './services/brapi-provider.service';
import { AlphaVantageProvider } from './services/alpha-vantage-provider.service';
import { AssetSyncService } from './services/asset-sync.service';
import { BrazilianStocksFetcherService } from './services/brazilian-stocks-fetcher.service';

@Module({
  imports: [TypeOrmModule.forFeature([InvestmentOperation, AssetType, Exchange, Asset])],
  controllers: [InvestmentsController],
  providers: [
    InvestmentsService,
    ExternalAssetsService,
    DatabaseAssetProvider,
    DadosMercadoProvider,
    B3Provider,
    BrapiProvider,
    AlphaVantageProvider,
    AssetSyncService,
    BrazilianStocksFetcherService,
  ],
  exports: [InvestmentsService, ExternalAssetsService],
})
export class InvestmentsModule implements OnModuleInit {
  constructor(private readonly investmentsService: InvestmentsService) {}

  async onModuleInit() {
    // Popular asset types
    const existingAssetTypes = await this.investmentsService.getAssetTypes();
    if (existingAssetTypes.length === 0) {
      await this.investmentsService.seedAssetTypes(assetTypesSeed);
      console.log('✅ Asset types populados com sucesso!');
    }

    // Popular exchanges
    try {
      const exchangesSeed = await loadExchangesSeed();
      if (exchangesSeed.length > 0) {
        await this.investmentsService.seedExchanges(exchangesSeed);
        console.log(`✅ ${exchangesSeed.length} exchanges populadas com sucesso!`);
      }
    } catch (error) {
      console.error('⚠️ Erro ao popular exchanges:', error);
    }

    // Popular assets do JSON
    try {
      const assetsSeed = await loadAssetsSeed();
      if (assetsSeed.length > 0) {
        await this.investmentsService.seedAssets(assetsSeed);
        console.log(`✅ ${assetsSeed.length} assets populados com sucesso!`);
      }
    } catch (error) {
      console.error('⚠️ Erro ao popular assets:', error);
    }
  }
}
