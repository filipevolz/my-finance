/**
 * Script para remover assets que não têm pic (logo da BRAPI)
 * Isso remove assets que foram adicionados/enriquecidos pela Alpha Vantage
 * Execute: npx ts-node scripts/remove-non-brapi-assets.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  console.log('🚀 Iniciando remoção de assets sem logo da BRAPI...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const assetRepo = dataSource.getRepository(Asset);

  const logger = new Logger('RemoveNonBrapiAssets');

  try {
    // Buscar todos os assets do tipo STOCK que não têm pic (logo da BRAPI)
    const stocksWithoutPic = await assetRepo.find({
      where: {
        assetGroup: 'STOCK',
      },
    });

    // Filtrar apenas os que não têm pic ou têm pic vazio
    const toRemove = stocksWithoutPic.filter(
      (stock) => !stock.pic || stock.pic.trim() === '',
    );

    logger.log(`Encontrados ${toRemove.length} assets sem logo da BRAPI para remover`);

    if (toRemove.length === 0) {
      console.log('✅ Nenhum asset para remover!');
      await app.close();
      return;
    }

    // Confirmar antes de remover
    console.log(`\n⚠️  ATENÇÃO: ${toRemove.length} assets serão removidos!`);
    console.log('Exemplos de assets que serão removidos:');
    toRemove.slice(0, 10).forEach((asset) => {
      console.log(`  - ${asset.ticker}: ${asset.assetName}`);
    });
    if (toRemove.length > 10) {
      console.log(`  ... e mais ${toRemove.length - 10} assets`);
    }

    // Remover assets
    let removed = 0;
    for (const asset of toRemove) {
      try {
        await assetRepo.remove(asset);
        removed++;
        logger.log(`✅ Removido ${asset.ticker}: ${asset.assetName}`);
      } catch (error: any) {
        logger.error(`❌ Erro ao remover ${asset.ticker}: ${error.message}`);
      }
    }

    console.log('\n✅ Remoção concluída!');
    console.log(`📊 Removidos: ${removed}`);
    console.log(`📈 Total processado: ${toRemove.length}`);
  } catch (error: any) {
    logger.error(`\n❌ Erro durante remoção: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();



