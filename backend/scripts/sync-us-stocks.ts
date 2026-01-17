/**
 * Script para sincronizar ações dos EUA da API brapi
 * Execute: npx ts-node scripts/sync-us-stocks.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

/**
 * Lista de ações populares dos EUA (S&P 500 principais e outras populares)
 */
const POPULAR_US_STOCKS = [
  // Tech
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
  'AMD', 'INTC', 'CSCO', 'ORCL', 'CRM', 'ADBE', 'NOW', 'SNOW', 'PLTR',
  // Finance
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'AXP', 'V', 'MA',
  // Healthcare
  'UNH', 'JNJ', 'PFE', 'ABBV', 'TMO', 'ABT', 'DHR', 'ISRG', 'REGN', 'GILD',
  // Consumer
  'WMT', 'HD', 'MCD', 'SBUX', 'NKE', 'TGT', 'LOW', 'TJX', 'COST', 'BKNG',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG',
  // Industrial
  'BA', 'CAT', 'GE', 'HON', 'RTX', 'DE', 'UPS', 'LMT', 'NOC',
  // Communication
  'VZ', 'T', 'CMCSA', 'DIS', 'NFLX', 'PARA',
  // Materials
  'LIN', 'APD', 'ECL',
  // Utilities
  'NEE', 'DUK', 'SO', 'AEP',
  // Real Estate
  'AMT', 'PLD', 'EQIX', 'PSA',
  // Others
  'BRK.B', 'PG', 'PM', 'MO', 'KO', 'PEP', 'AVGO', 'QCOM', 'TXN', 'AMAT',
  'KLAC', 'LRCX', 'ASML', 'SNPS', 'CDNS', 'ANET', 'FTNT', 'CRWD', 'ZS',
  'PANW', 'NET', 'DDOG', 'MDB', 'ESTC', 'DOCN', 'GTLB', 'FROG', 'TEAM',
  'ZM', 'DOCU', 'OKTA', 'SPLK', 'VRNS', 'QLYS', 'RDWR', 'QLYS', 'RDWR',
];

async function bootstrap() {
  console.log('🚀 Iniciando sincronização de ações dos EUA...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const assetRepo = dataSource.getRepository(Asset);

  const logger = new Logger('SyncUSStocks');

  try {
    const token = configService.get<string>('BRAPI_TOKEN');
    let created = 0;
    let updated = 0;
    let errors = 0;

    // Processar em lotes
    const batchSize = 10;
    for (let i = 0; i < POPULAR_US_STOCKS.length; i += batchSize) {
      const batch = POPULAR_US_STOCKS.slice(i, i + batchSize);

      for (const ticker of batch) {
        try {
          // Buscar dados do ticker na API brapi
          const url = `https://brapi.dev/api/quote/${ticker}`;
          const urlWithToken = token ? `${url}?token=${token}` : url;

          const response = await fetch(urlWithToken);

          if (!response.ok) {
            logger.warn(`Erro ao buscar ${ticker}: HTTP ${response.status}`);
            errors++;
            continue;
          }

          const data = await response.json();
          const result = data.results?.[0];

          if (!result) {
            logger.debug(`Nenhum resultado encontrado para ${ticker}`);
            errors++;
            continue;
          }

          // A API brapi retorna 'logourl' ao invés de 'logo'
          const logoUrl = result.logourl || result.logo;
          const name = result.longName || result.shortName || ticker;

          // Verificar se já existe
          const existing = await assetRepo.findOne({
            where: { ticker },
          });

          if (existing) {
            // Atualizar
            existing.assetName = name;
            existing.legalName = result.longName || existing.legalName;
            existing.pic = logoUrl || existing.pic;
            existing.sector = result.sector || existing.sector;
            existing.marketString = 'NYSE/NASDAQ';
            existing.assetGroup = 'STOCK_USA';
            
            await assetRepo.save(existing);
            updated++;
            logger.log(`✅ Atualizado ${ticker}: ${name}`);
          } else {
            // Criar novo
            const asset = assetRepo.create({
              assetName: name,
              ticker,
              alias: ticker,
              legalName: result.longName || null,
              pic: logoUrl || null,
              sector: result.sector || null,
              marketString: 'NYSE/NASDAQ',
              assetGroup: 'STOCK_USA',
              tax: 0,
              market: 0,
              exemption: false,
            });

            await assetRepo.save(asset);
            created++;
            logger.log(`✅ Criado ${ticker}: ${name}`);
          }

          // Aguardar um pouco para não sobrecarregar a API
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error: any) {
          logger.error(`❌ Erro ao processar ${ticker}: ${error.message}`);
          errors++;
        }
      }

      // Aguardar entre lotes
      if (i + batchSize < POPULAR_US_STOCKS.length) {
        logger.log(`Processados ${Math.min(i + batchSize, POPULAR_US_STOCKS.length)}/${POPULAR_US_STOCKS.length}...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Sincronização concluída!');
    console.log(`📊 Criados: ${created}`);
    console.log(`🔄 Atualizados: ${updated}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📈 Total processado: ${POPULAR_US_STOCKS.length}`);
  } catch (error: any) {
    logger.error(`\n❌ Erro durante sincronização: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

