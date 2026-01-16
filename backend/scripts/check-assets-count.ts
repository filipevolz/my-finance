/**
 * Script para verificar quantos assets existem no banco
 * Execute: npx ts-node scripts/check-assets-count.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../src/investments/asset.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
  console.log('🔍 Verificando quantidade de assets no banco...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const assetRepository = app.get<Repository<Asset>>(getRepositoryToken(Asset));
    
    const total = await assetRepository.count();
    const stocks = await assetRepository.count({ where: { assetGroup: 'STOCK' } });
    
    console.log(`📊 Total de assets: ${total}`);
    console.log(`📈 Assets STOCK: ${stocks}`);
    console.log(`📋 Outros grupos: ${total - stocks}`);
    
    // Mostrar alguns exemplos
    const samples = await assetRepository.find({
      take: 10,
      order: { createdAt: 'DESC' },
    });
    
    console.log('\n📝 Últimos 10 assets criados:');
    samples.forEach((asset, index) => {
      console.log(`${index + 1}. ${asset.ticker} - ${asset.assetName} (${asset.assetGroup})`);
    });
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
