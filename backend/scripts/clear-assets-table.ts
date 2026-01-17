/**
 * Script para limpar completamente a tabela assets
 * Execute: npx ts-node scripts/clear-assets-table.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  console.log('🚀 Iniciando limpeza da tabela assets...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const assetRepo = dataSource.getRepository(Asset);

  const logger = new Logger('ClearAssetsTable');

  try {
    // Contar quantos assets existem
    const count = await assetRepo.count();
    logger.log(`Encontrados ${count} assets na tabela`);

    if (count === 0) {
      console.log('✅ Tabela assets já está vazia!');
      await app.close();
      return;
    }

    // Limpar toda a tabela
    logger.log('🗑️  Limpando tabela assets...');
    await assetRepo.clear();
    
    console.log('\n✅ Tabela assets limpa com sucesso!');
    console.log(`📊 ${count} assets removidos`);
  } catch (error: any) {
    logger.error(`\n❌ Erro durante limpeza: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();



