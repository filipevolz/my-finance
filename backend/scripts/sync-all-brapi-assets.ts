/**
 * Script para limpar e repovoar a tabela assets apenas com dados da API brapi
 * Execute: npx ts-node scripts/sync-all-brapi-assets.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

/**
 * Determina o assetGroup baseado no tipo retornado pela API brapi
 */
function determineAssetGroup(type: string | undefined, ticker: string): string {
  if (!type) {
    // Tentar inferir pelo ticker
    if (ticker.endsWith('11')) return 'FII';
    if (ticker.endsWith('34')) return 'BDR';
    if (ticker.match(/^[A-Z]{4}\d{1,2}$/)) return 'STOCK';
    return 'STOCK';
  }

  const typeLower = type.toLowerCase();
  if (typeLower.includes('stock') || typeLower.includes('ação')) {
    // Verificar se é BDR (geralmente termina com 34)
    if (ticker.endsWith('34')) return 'BDR';
    // Verificar se é ação EUA (sem sufixo numérico ou formato diferente)
    if (ticker.match(/^[A-Z]{1,5}$/) && !ticker.match(/\d/)) return 'STOCK_USA';
    return 'STOCK';
  }
  if (typeLower.includes('etf') || typeLower.includes('fundo índice')) {
    return 'ETF';
  }
  if (typeLower.includes('fii') || typeLower.includes('fundo imobiliário')) {
    return 'FII';
  }
  if (typeLower.includes('bdr')) {
    return 'BDR';
  }

  return 'STOCK';
}

async function bootstrap() {
  console.log('🚀 Iniciando sincronização completa de assets da API brapi...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);
  const assetRepo = dataSource.getRepository(Asset);

  const logger = new Logger('SyncAllBrapiAssets');

  try {
    const token = configService.get<string>('BRAPI_TOKEN');

    // PASSO 1: Limpar toda a tabela assets
    logger.log('🗑️  Limpando tabela assets...');
    await assetRepo.clear();
    logger.log('✅ Tabela assets limpa!');

    // PASSO 2: Buscar todos os assets da API brapi usando /quote/list
    logger.log('📡 Buscando assets da API brapi...');

    let page = 1;
    let hasNextPage = true;
    let totalCreated = 0;
    let totalErrors = 0;
    const allAssets: Array<{
      ticker: string;
      name: string;
      logo: string | null;
      type: string | undefined;
      sector: string | undefined;
    }> = [];

    // Buscar todas as páginas
    while (hasNextPage) {
      try {
        const url = new URL('https://brapi.dev/api/quote/list');
        url.searchParams.append('page', page.toString());
        url.searchParams.append('limit', '100'); // Máximo por página
        if (token) {
          url.searchParams.append('token', token);
        }

        logger.log(`Buscando página ${page}...`);

        const response = await fetch(url.toString());

        if (!response.ok) {
          logger.warn(`Erro ao buscar página ${page}: HTTP ${response.status}`);
          hasNextPage = false;
          break;
        }

        const data = await response.json();

        // Processar stocks da página atual
        if (data.stocks && Array.isArray(data.stocks)) {
          for (const stock of data.stocks) {
            allAssets.push({
              ticker: stock.stock || stock.symbol,
              name: stock.name || stock.stock || stock.symbol,
              logo: stock.logo || null,
              type: stock.type,
              sector: stock.sector || undefined,
            });
          }
        }

        // Verificar se há próxima página
        hasNextPage = data.hasNextPage === true;
        page++;

        // Aguardar um pouco entre páginas
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        logger.error(`Erro ao buscar página ${page}: ${error.message}`);
        hasNextPage = false;
      }
    }

    logger.log(`📊 Encontrados ${allAssets.length} assets na API brapi`);

    // PASSO 3: Salvar todos os assets no banco
    logger.log('💾 Salvando assets no banco...');

    const batchSize = 50;
    for (let i = 0; i < allAssets.length; i += batchSize) {
      const batch = allAssets.slice(i, i + batchSize);

      for (const assetData of batch) {
        try {
          const assetGroup = determineAssetGroup(assetData.type, assetData.ticker);
          const marketString = assetGroup === 'STOCK_USA' ? 'NYSE/NASDAQ' : 'Bovespa';

          const asset = assetRepo.create({
            assetName: assetData.name,
            ticker: assetData.ticker,
            alias: assetData.ticker,
            pic: assetData.logo,
            sector: assetData.sector || null,
            marketString,
            assetGroup,
            tax: 0,
            market: 0,
            exemption: false,
          });

          await assetRepo.save(asset);
          totalCreated++;
        } catch (error: any) {
          // Se erro de constraint unique, pode ser duplicata
          if (error.code === '23505' || error.message?.includes('unique')) {
            logger.debug(`Ticker ${assetData.ticker} já existe, pulando...`);
          } else {
            logger.error(`Erro ao salvar ${assetData.ticker}: ${error.message}`);
            totalErrors++;
          }
        }
      }

      if (i + batchSize < allAssets.length) {
        logger.log(`Processados ${Math.min(i + batchSize, allAssets.length)}/${allAssets.length}...`);
      }
    }

    // PASSO 4: Compartilhar logos entre assets do mesmo grupo
    logger.log('🔄 Compartilhando logos entre assets do mesmo grupo...');
    const allAssetsInDb = await assetRepo.find();
    
    // Agrupar por prefixo
    const groups: Record<string, Asset[]> = {};
    allAssetsInDb.forEach((asset) => {
      const prefix = asset.ticker.replace(/\d+.*$/, ''); // Remover números do final
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(asset);
    });

    let sharedLogos = 0;
    for (const [prefix, assets] of Object.entries(groups)) {
      const assetsWithPic = assets.filter((a) => a.pic && a.pic.trim() !== '');
      if (assetsWithPic.length === 0) continue;

      const sharedPic = assetsWithPic[0].pic;
      const assetsWithoutPic = assets.filter((a) => !a.pic || a.pic.trim() === '');

      for (const asset of assetsWithoutPic) {
        asset.pic = sharedPic;
        await assetRepo.save(asset);
        sharedLogos++;
      }
    }

    console.log('\n✅ Sincronização completa concluída!');
    console.log(`📊 Assets criados: ${totalCreated}`);
    console.log(`🔄 Logos compartilhados: ${sharedLogos}`);
    console.log(`❌ Erros: ${totalErrors}`);
    console.log(`📈 Total processado: ${allAssets.length}`);
  } catch (error: any) {
    logger.error(`\n❌ Erro durante sincronização: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();



