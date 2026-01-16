/**
 * Script para sincronizar todas as ações brasileiras
 * Execute: npx ts-node scripts/sync-brazilian-stocks.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { BrazilianStocksFetcherService } from '../src/investments/services/brazilian-stocks-fetcher.service';

async function bootstrap() {
  console.log('🚀 Iniciando sincronização de ações brasileiras...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(BrazilianStocksFetcherService);

  try {
    const result = await service.syncAllBrazilianStocks();
    
    console.log('\n✅ Sincronização concluída!');
    console.log(`📊 Criados: ${result.created}`);
    console.log(`🔄 Atualizados: ${result.updated}`);
    console.log(`📈 Total processado: ${result.created + result.updated}`);
  } catch (error) {
    console.error('\n❌ Erro durante sincronização:', error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
