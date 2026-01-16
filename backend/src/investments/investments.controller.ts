import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InvestmentsService } from './investments.service';
import { CreateInvestmentOperationDto } from './dto/create-investment-operation.dto';
import { UpdateInvestmentOperationDto } from './dto/update-investment-operation.dto';
import { ExternalAssetsService } from './services/external-assets.service';
import { AssetSyncService } from './services/asset-sync.service';
import { BrazilianStocksFetcherService } from './services/brazilian-stocks-fetcher.service';

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(
    private readonly investmentsService: InvestmentsService,
    private readonly externalAssetsService: ExternalAssetsService,
    private readonly assetSyncService: AssetSyncService,
    private readonly brazilianStocksFetcher: BrazilianStocksFetcherService,
  ) {}

  @Post('operations')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() userId: string,
    @Body(ValidationPipe) createDto: CreateInvestmentOperationDto,
  ) {
    const operation = await this.investmentsService.create(userId, createDto);
    return {
      message: 'Operação de investimento criada com sucesso',
      data: operation,
    };
  }

  @Get('operations')
  async findAll(@CurrentUser() userId: string) {
    const operations = await this.investmentsService.findAll(userId);
    return { data: operations };
  }

  @Get('operations/:id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ) {
    const operation = await this.investmentsService.findOne(id, userId);
    return { data: operation };
  }

  @Put('operations/:id')
  async update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body(ValidationPipe) updateDto: UpdateInvestmentOperationDto,
  ) {
    const operation = await this.investmentsService.update(id, userId, updateDto);
    return {
      message: 'Operação de investimento atualizada com sucesso',
      data: operation,
    };
  }

  @Delete('operations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() userId: string) {
    await this.investmentsService.remove(id, userId);
  }

  @Get('position')
  async getCurrentPosition(@CurrentUser() userId: string) {
    const position = await this.investmentsService.getCurrentPosition(userId);
    return { data: position };
  }

  @Get('evolution')
  async getMonthlyEvolution(@CurrentUser() userId: string) {
    const evolution = await this.investmentsService.getMonthlyEvolution(userId);
    return { data: evolution };
  }

  @Get('operations/asset/:asset')
  async getOperationsByAsset(
    @Param('asset') asset: string,
    @CurrentUser() userId: string,
  ) {
    const operations = await this.investmentsService.getOperationsByAsset(
      userId,
      asset,
    );
    return { data: operations };
  }

  @Get('operations/month/:month')
  async getOperationsByMonth(
    @Param('month') month: string,
    @CurrentUser() userId: string,
  ) {
    const operations = await this.investmentsService.getOperationsByMonth(
      userId,
      month,
    );
    return { data: operations };
  }

  @Get('asset-types')
  async getAssetTypes() {
    const assetTypes = await this.investmentsService.getAssetTypes();
    return { data: assetTypes };
  }

  @Get('exchanges')
  async getExchanges() {
    const exchanges = await this.investmentsService.getExchanges();
    return { data: exchanges };
  }

  /**
   * Endpoint para buscar assets do banco de dados
   * GET /assets?search=&assetGroup=&limit=
   */
  @Get('assets')
  async searchAssets(
    @Query('search') search?: string,
    @Query('assetGroup') assetGroup?: string,
    @Query('limit') limit?: string,
    // Parâmetros compatíveis com MyProfit
    @Query('assetSearch') assetSearch?: string,
    @Query('group') group?: string,
    @Query('offset') offset?: string,
  ) {
    // Se usar parâmetros do MyProfit, retornar formato MyProfit
    if (assetSearch !== undefined || group !== undefined) {
      const limitNum = limit ? parseInt(limit, 10) : 50;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      const assets = await this.externalAssetsService.searchAssets(
        assetSearch || search,
        group || assetGroup || 'STOCK',
        limitNum,
        offsetNum,
      );

      return assets; // Retorna array direto, formato MyProfit
    }

    // Caso contrário, retornar formato padrão do banco
    const assets = await this.investmentsService.searchAssets(
      search,
      assetGroup,
      limit ? parseInt(limit, 10) : 50,
    );
    return { data: assets };
  }

  /**
   * Endpoint para sincronizar assets da API MyProfit (legado)
   */
  @Get('assets/sync')
  async syncAssets(@Query('group') group?: string) {
    const synced = await this.investmentsService.syncAssetsFromAPI(
      group || 'STOCK',
    );
    return {
      message: `${synced} assets sincronizados com sucesso`,
      synced,
    };
  }

  /**
   * Endpoint para sincronizar assets de APIs públicas externas
   * GET /investments/assets/sync-external?group=STOCK&limit=100
   */
  @Get('assets/sync-external')
  async syncAssetsFromExternal(
    @Query('group') group?: string,
    @Query('limit') limit?: string,
  ) {
    const synced = await this.assetSyncService.syncAssetsFromExternalAPI(
      group || 'STOCK',
      limit ? parseInt(limit, 10) : 100,
    );
    return {
      message: `${synced} assets sincronizados com sucesso da API externa`,
      synced,
    };
  }

  /**
   * Endpoint para sincronizar assets por busca
   * GET /investments/assets/sync-search?search=PETR&group=STOCK
   */
  @Get('assets/sync-search')
  async syncAssetsBySearch(
    @Query('search') search: string,
    @Query('group') group?: string,
  ) {
    if (!search) {
      return {
        message: 'Parâmetro "search" é obrigatório',
        synced: 0,
      };
    }

    const synced = await this.assetSyncService.syncAssetsBySearch(
      search,
      group || 'STOCK',
    );
    return {
      message: `${synced} assets sincronizados com sucesso`,
      synced,
    };
  }

  @Get('assets/ticker/:ticker')
  async getAssetByTicker(@Param('ticker') ticker: string) {
    const asset = await this.investmentsService.getAssetByTicker(ticker);
    if (!asset) {
      return { data: null };
    }
    return { data: asset };
  }

  /**
   * Endpoint compatível com MyProfit
   * GET /assets?assetSearch=&group=STOCK
   * Retorna dados no formato MyProfit com paginação
   * Este endpoint substitui a API privada do MyProfit
   */
  @Get('assets/myprofit')
  async getAssetsMyProfitFormat(
    @Query('assetSearch') assetSearch?: string,
    @Query('group') group?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const assets = await this.externalAssetsService.searchAssets(
      assetSearch,
      group || 'STOCK',
      limitNum,
      offsetNum,
    );

    return assets;
  }

  /**
   * Endpoint para sincronizar TODAS as ações brasileiras
   * GET /investments/assets/sync-all-brazilian-stocks
   * 
   * Busca lista completa de ações brasileiras de APIs públicas
   * e enriquece com dados de múltiplas fontes (brapi.dev, Alpha Vantage)
   */
  @Get('assets/sync-all-brazilian-stocks')
  async syncAllBrazilianStocks() {
    const result = await this.brazilianStocksFetcher.syncAllBrazilianStocks();
    return {
      message: `Sincronização concluída: ${result.created} criados, ${result.updated} atualizados`,
      created: result.created,
      updated: result.updated,
      total: result.created + result.updated,
    };
  }
}
