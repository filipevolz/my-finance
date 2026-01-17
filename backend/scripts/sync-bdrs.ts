/**
 * Script para sincronizar BDRs (Brazilian Depositary Receipts) da API brapi
 * Execute: npx ts-node scripts/sync-bdrs.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

/**
 * Lista de BDRs populares negociados na B3
 * BDRs geralmente têm sufixo 34 (ex: AAPL34, MSFT34)
 */
const POPULAR_BDRS = [
  // Tech
  'AAPL34', 'MSFT34', 'GOOGL34', 'GOOG34', 'AMZN34', 'META34', 'TSLA34',
  'NVDA34', 'NFLX34', 'AMD34', 'INTC34', 'CSCO34', 'ORCL34', 'CRM34',
  'ADBE34', 'NOW34', 'SNOW34', 'PLTR34',
  // Finance
  'JPM34', 'BAC34', 'WFC34', 'GS34', 'MS34', 'C34', 'BLK34', 'SCHW34',
  'AXP34', 'V34', 'MA34',
  // Healthcare
  'UNH34', 'JNJ34', 'PFE34', 'ABBV34', 'TMO34', 'ABT34', 'DHR34',
  'ISRG34', 'REGN34', 'GILD34',
  // Consumer
  'WMT34', 'HD34', 'MCD34', 'SBUX34', 'NKE34', 'TGT34', 'LOW34',
  'TJX34', 'COST34', 'BKNG34',
  // Energy
  'XOM34', 'CVX34', 'COP34', 'SLB34', 'EOG34',
  // Industrial
  'BA34', 'CAT34', 'GE34', 'HON34', 'RTX34', 'DE34', 'UPS34', 'LMT34',
  'NOC34',
  // Communication
  'VZ34', 'T34', 'CMCSA34', 'DIS34', 'PARA34',
  // Materials
  'LIN34', 'APD34', 'ECL34',
  // Utilities
  'NEE34', 'DUK34', 'SO34', 'AEP34',
  // Real Estate
  'AMT34', 'PLD34', 'EQIX34', 'PSA34',
  // Others
  'BRK34', 'PG34', 'PM34', 'MO34', 'KO34', 'PEP34', 'AVGO34', 'QCOM34',
  'TXN34', 'AMAT34', 'KLAC34', 'LRCX34', 'ASML34', 'SNPS34', 'CDNS34',
  'ANET34', 'FTNT34', 'CRWD34', 'ZS34', 'PANW34', 'NET34', 'DDOG34',
  'MDB34', 'ESTC34', 'DOCN34', 'GTLB34', 'FROG34', 'TEAM34', 'ZM34',
  'DOCU34', 'OKTA34', 'SPLK34', 'VRNS34', 'QLYS34', 'RDWR34',
  // BDRs com outros sufixos conhecidos
  'COCA34', 'PEPB34', 'MELI34', 'ITLC34', 'ITUB34', 'BIDI34',
];

async function bootstrap() {
  console.log('🚀 Iniciando sincronização de BDRs...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const assetRepo = dataSource.getRepository(Asset);

  const logger = new Logger('SyncBDRs');

  try {
    const token = configService.get<string>('BRAPI_TOKEN');
    let created = 0;
    let updated = 0;
    let errors = 0;

    // Processar em lotes
    const batchSize = 10;
    for (let i = 0; i < POPULAR_BDRS.length; i += batchSize) {
      const batch = POPULAR_BDRS.slice(i, i + batchSize);

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
            existing.marketString = 'Bovespa';
            existing.assetGroup = 'BDR';
            
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
              marketString: 'Bovespa',
              assetGroup: 'BDR',
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
      if (i + batchSize < POPULAR_BDRS.length) {
        logger.log(`Processados ${Math.min(i + batchSize, POPULAR_BDRS.length)}/${POPULAR_BDRS.length}...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Sincronização concluída!');
    console.log(`📊 Criados: ${created}`);
    console.log(`🔄 Atualizados: ${updated}`);
    console.log(`❌ Erros: ${errors}`);
    console.log(`📈 Total processado: ${POPULAR_BDRS.length}`);
  } catch (error: any) {
    logger.error(`\n❌ Erro durante sincronização: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();



