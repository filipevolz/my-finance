/**
 * Script para atualizar a coluna pic dos assets usando o campo logo da API brapi
 * Execute: npx ts-node scripts/update-assets-pic.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  console.log('🚀 Iniciando atualização de pics dos assets...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const assetRepo = dataSource.getRepository(Asset);

  const logger = new Logger('UpdateAssetsPic');

  try {
    // Buscar todos os assets do tipo STOCK, STOCK_USA e BDR
    const stocks = await assetRepo.find({
      where: [
        { assetGroup: 'STOCK' },
        { assetGroup: 'STOCK_USA' },
        { assetGroup: 'BDR' },
      ],
    });

    logger.log(`Encontrados ${stocks.length} stocks (BR + EUA + BDR) para atualizar`);

    const token = configService.get<string>('BRAPI_TOKEN');
    let updated = 0;
    let notFound = 0;
    let errors = 0;

    // Processar em lotes para não sobrecarregar a API
    const batchSize = 10;
    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);

      for (const stock of batch) {
        try {
          // Buscar dados do ticker na API brapi
          const url = `https://brapi.dev/api/quote/${stock.ticker}`;
          const urlWithToken = token ? `${url}?token=${token}` : url;

          const response = await fetch(urlWithToken);

          if (!response.ok) {
            logger.warn(`Erro ao buscar ${stock.ticker}: HTTP ${response.status}`);
            errors++;
            continue;
          }

          const data = await response.json();
          const result = data.results?.[0];

          if (!result) {
            logger.debug(`Nenhum resultado encontrado para ${stock.ticker}`);
            notFound++;
            continue;
          }

          // A API brapi retorna 'logourl' ao invés de 'logo'
          const logoUrl = result.logourl || result.logo;

          if (!logoUrl) {
            logger.debug(`Logo não encontrado para ${stock.ticker}`);
            notFound++;
            continue;
          }

          // Atualizar apenas se o logo for diferente do atual
          if (stock.pic !== logoUrl) {
            stock.pic = logoUrl;
            await assetRepo.save(stock);
            updated++;
            logger.log(`✅ Atualizado ${stock.ticker}: ${logoUrl}`);
          } else {
            logger.debug(`⏭️  ${stock.ticker} já está atualizado`);
          }

          // Aguardar um pouco para não sobrecarregar a API
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error: any) {
          logger.error(`❌ Erro ao processar ${stock.ticker}: ${error.message}`);
          errors++;
        }
      }

      // Aguardar entre lotes
      if (i + batchSize < stocks.length) {
        logger.log(`Processados ${Math.min(i + batchSize, stocks.length)}/${stocks.length}...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Atualização concluída!');
    console.log(`📊 Atualizados: ${updated}`);
    console.log(`⚠️  Não encontrados: ${notFound}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📈 Total processado: ${stocks.length}`);
  } catch (error: any) {
    logger.error(`\n❌ Erro durante atualização: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

