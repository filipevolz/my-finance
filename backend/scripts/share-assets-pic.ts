/**
 * Script para compartilhar logos entre assets do mesmo grupo
 * Ex: PETR4 tem logo, então PETR3, PETR3F, PETR4F também usam o mesmo logo
 * Execute: npx ts-node scripts/share-assets-pic.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { Logger } from '@nestjs/common';

/**
 * Extrai o prefixo do ticker (parte antes dos números)
 * Ex: "PETR4" -> "PETR", "ITUB4" -> "ITUB", "VALE3" -> "VALE"
 */
function extractTickerPrefix(ticker: string): string {
  // Remove números e caracteres especiais do final
  const match = ticker.match(/^([A-Z]+)/);
  return match ? match[1] : ticker;
}

async function bootstrap() {
  console.log('🚀 Iniciando compartilhamento de logos entre assets do mesmo grupo...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const assetRepo = dataSource.getRepository(Asset);

  const logger = new Logger('ShareAssetsPic');

  try {
    // Buscar todos os assets do tipo STOCK, STOCK_USA e BDR
    const stocks = await assetRepo.find({
      where: [
        { assetGroup: 'STOCK' },
        { assetGroup: 'STOCK_USA' },
        { assetGroup: 'BDR' },
      ],
    });

    logger.log(`Encontrados ${stocks.length} stocks (BR + EUA + BDR) para processar`);

    // Agrupar por prefixo
    const groups: Record<string, Asset[]> = {};
    
    stocks.forEach((stock) => {
      const prefix = extractTickerPrefix(stock.ticker);
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(stock);
    });

    logger.log(`Encontrados ${Object.keys(groups).length} grupos de assets`);

    let updated = 0;
    let skipped = 0;

    // Para cada grupo, encontrar assets com logo e compartilhar com os sem logo
    for (const [prefix, assets] of Object.entries(groups)) {
      // Encontrar assets com logo no grupo
      const assetsWithPic = assets.filter((a) => a.pic && a.pic.trim() !== '');
      
      if (assetsWithPic.length === 0) {
        // Nenhum asset do grupo tem logo, pular
        skipped++;
        continue;
      }

      // Usar o primeiro logo encontrado (ou podemos escolher o mais comum)
      const sharedPic = assetsWithPic[0].pic;

      // Atualizar assets sem logo
      const assetsWithoutPic = assets.filter((a) => !a.pic || a.pic.trim() === '');
      
      for (const asset of assetsWithoutPic) {
        asset.pic = sharedPic;
        await assetRepo.save(asset);
        updated++;
        logger.log(`✅ ${asset.ticker} agora usa o logo de ${assetsWithPic[0].ticker}: ${sharedPic}`);
      }
    }

    console.log('\n✅ Compartilhamento concluído!');
    console.log(`📊 Atualizados: ${updated}`);
    console.log(`⏭️  Grupos sem logo: ${skipped}`);
    console.log(`📈 Total de grupos processados: ${Object.keys(groups).length}`);
  } catch (error: any) {
    logger.error(`\n❌ Erro durante compartilhamento: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

