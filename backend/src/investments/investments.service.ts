import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentOperation, OperationType } from './investment-operation.entity';
import { AssetType } from './asset-type.entity';
import { Exchange } from './exchange.entity';
import { Asset } from './asset.entity';
import { CreateInvestmentOperationDto } from './dto/create-investment-operation.dto';
import { UpdateInvestmentOperationDto } from './dto/update-investment-operation.dto';
import { ExternalAssetsService } from './services/external-assets.service';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(InvestmentOperation)
    private operationsRepository: Repository<InvestmentOperation>,
    @InjectRepository(AssetType)
    private assetTypeRepository: Repository<AssetType>,
    @InjectRepository(Exchange)
    private exchangeRepository: Repository<Exchange>,
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
    private readonly externalAssetsService: ExternalAssetsService,
  ) { }

  async create(
    userId: string,
    createDto: CreateInvestmentOperationDto,
  ): Promise<InvestmentOperation> {
    // Converter string YYYY-MM-DD para Date object
    const dateStr = createDto.date.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    // Calcular totalAmount baseado no tipo de operação
    let totalAmount: number;
    if (createDto.type === OperationType.BUY || createDto.type === OperationType.SELL) {
      // Para compra/venda: quantidade * preço
      totalAmount = Math.round(createDto.quantity * createDto.price * 100); // Converter para centavos
    } else {
      // Para proventos: o totalAmount já é o valor recebido
      totalAmount = Math.round(createDto.price * 100); // price já representa o valor total em reais
    }

    const operation = this.operationsRepository.create({
      userId,
      asset: createDto.asset,
      assetClass: createDto.assetClass || 'other',
      type: createDto.type,
      date,
      quantity: Math.round(createDto.quantity * 10000), // Armazenar em centavos (permite frações)
      price: Math.round(createDto.price * 100), // Preço em centavos
      totalAmount,
      currency: createDto.currency || 'BRL',
      broker: createDto.broker || null,
      notes: createDto.notes || null,
    });

    return await this.operationsRepository.save(operation);
  }

  async findAll(userId: string): Promise<InvestmentOperation[]> {
    return await this.operationsRepository.find({
      where: { userId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<InvestmentOperation> {
    const operation = await this.operationsRepository.findOne({
      where: { id },
    });

    if (!operation) {
      throw new NotFoundException('Operação não encontrada');
    }

    if (operation.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta operação');
    }

    return operation;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateInvestmentOperationDto,
  ): Promise<InvestmentOperation> {
    const operation = await this.findOne(id, userId);

    if (updateDto.date) {
      const dateStr = updateDto.date.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      operation.date = new Date(year, month - 1, day);
    }

    if (updateDto.asset) operation.asset = updateDto.asset;
    if (updateDto.assetClass) operation.assetClass = updateDto.assetClass;
    if (updateDto.type) operation.type = updateDto.type;
    if (updateDto.quantity !== undefined) {
      operation.quantity = Math.round(updateDto.quantity * 10000);
    }
    if (updateDto.price !== undefined) {
      operation.price = Math.round(updateDto.price * 100);
    }
    if (updateDto.currency) operation.currency = updateDto.currency;
    if (updateDto.broker !== undefined) operation.broker = updateDto.broker;
    if (updateDto.notes !== undefined) operation.notes = updateDto.notes;

    // Recalcular totalAmount se necessário
    if (updateDto.type || updateDto.quantity !== undefined || updateDto.price !== undefined) {
      const type = updateDto.type || operation.type;
      const quantity = updateDto.quantity !== undefined ? updateDto.quantity : operation.quantity / 10000;
      const price = updateDto.price !== undefined ? updateDto.price : operation.price / 100;

      if (type === OperationType.BUY || type === OperationType.SELL) {
        operation.totalAmount = Math.round(quantity * price * 100);
      } else {
        operation.totalAmount = Math.round(price * 100);
      }
    }

    return await this.operationsRepository.save(operation);
  }

  async remove(id: string, userId: string): Promise<void> {
    const operation = await this.findOne(id, userId);
    await this.operationsRepository.remove(operation);
  }

  async getCurrentPosition(userId: string): Promise<
    Array<{
      asset: string;
      assetClass: string;
      quantity: number;
      averagePrice: number;
      currentValue: number;
      totalInvested: number;
      profit: number;
      profitPercentage: number;
      portfolioPercentage: number;
      broker: string | null;
      currency: string;
      averageHoldingTime: number;
    }>
  > {
    const operations = await this.findAll(userId);

    const positions: Record<
      string,
      {
        asset: string;
        assetClass: string;
        quantity: number;
        totalInvested: number;
        totalSold: number;
        operations: InvestmentOperation[];
        brokers: Set<string>;
        currencies: Set<string>;
        firstBuyDate: Date | null;
        lastOperationDate: Date | null;
      }
    > = {};

    operations.forEach((op) => {
      const key = `${op.asset}_${op.currency}`;

      if (!positions[key]) {
        positions[key] = {
          asset: op.asset,
          assetClass: op.assetClass,
          quantity: 0,
          totalInvested: 0,
          totalSold: 0,
          operations: [],
          brokers: new Set(),
          currencies: new Set(),
          firstBuyDate: null,
          lastOperationDate: null,
        };
      }

      const position = positions[key];
      const opDate = new Date(op.date);

      position.operations.push(op);
      position.brokers.add(op.broker || '');
      position.currencies.add(op.currency);

      if (op.type === OperationType.BUY) {
        position.quantity += op.quantity / 10000;
        position.totalInvested += op.totalAmount;

        if (!position.firstBuyDate || opDate < position.firstBuyDate) {
          position.firstBuyDate = opDate;
        }
      }

      if (op.type === OperationType.SELL) {
        const sellQuantity = op.quantity / 10000;
        const sellValue = op.totalAmount;

        if (position.quantity > 0) {
          const avgPrice = position.totalInvested / (position.quantity * 100);
          const costBasis =
            Math.min(sellQuantity, position.quantity) * avgPrice * 100;

          position.quantity = Math.max(0, position.quantity - sellQuantity);
          position.totalInvested = Math.max(
            0,
            position.totalInvested - costBasis,
          );
          position.totalSold += sellValue;
        }
      }

      if (!position.lastOperationDate || opDate > position.lastOperationDate) {
        position.lastOperationDate = opDate;
      }
    });

    const activePositions = Object.values(positions).filter(
      (p) => p.quantity > 0,
    );

    const totalPortfolioValue = activePositions.reduce(
      (sum, p) => sum + p.totalInvested,
      0,
    );

    return activePositions.map((position) => {
      const averagePrice =
        position.quantity > 0
          ? position.totalInvested / (position.quantity * 100)
          : 0;

      const currentValue = position.totalInvested;

      const profit = currentValue - position.totalInvested;

      const profitPercentage =
        position.totalInvested > 0
          ? (profit / position.totalInvested) * 100
          : 0;

      const portfolioPercentage =
        totalPortfolioValue > 0
          ? (position.totalInvested / totalPortfolioValue) * 100
          : 0;

      let averageHoldingTime = 0;

      if (position.firstBuyDate && position.lastOperationDate) {
        const first = new Date(position.firstBuyDate).getTime();
        const last = new Date(position.lastOperationDate).getTime();

        if (!isNaN(first) && !isNaN(last)) {
          const diffTime = last - first;
          averageHoldingTime = Math.round(
            diffTime / (1000 * 60 * 60 * 24),
          );
        }
      }

      return {
        asset: position.asset,
        assetClass: position.assetClass,
        quantity: position.quantity,
        averagePrice,
        currentValue,
        totalInvested: position.totalInvested,
        profit,
        profitPercentage,
        portfolioPercentage,
        broker:
          Array.from(position.brokers).filter((b) => b).join(', ') || null,
        currency: Array.from(position.currencies)[0] || 'BRL',
        averageHoldingTime,
      };
    });
  }


  // Calcular evolução mensal da carteira
  async getMonthlyEvolution(userId: string): Promise<
    Array<{
      month: string; // "2024-01"
      portfolioValue: number;
      contributions: number; // Aportes
      withdrawals: number; // Vendas
      dividends: number; // Proventos
      returns: number; // Rentabilidade em %
      cumulativeContributions: number;
      cumulativeDividends: number;
    }>
  > {
    const operations = await this.findAll(userId);

    // Agrupar por mês
    const monthlyData: Record<
      string,
      {
        contributions: number;
        withdrawals: number;
        dividends: number;
        operations: InvestmentOperation[];
      }
    > = {};

    operations.forEach((op) => {
      const date = new Date(op.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          contributions: 0,
          withdrawals: 0,
          dividends: 0,
          operations: [],
        };
      }

      monthlyData[monthKey].operations.push(op);

      if (op.type === OperationType.BUY) {
        monthlyData[monthKey].contributions += op.totalAmount;
      } else if (op.type === OperationType.SELL) {
        monthlyData[monthKey].withdrawals += op.totalAmount;
      } else if (op.type === OperationType.DIVIDEND || op.type === OperationType.INTEREST) {
        monthlyData[monthKey].dividends += op.totalAmount;
      }
    });

    // Ordenar meses
    const sortedMonths = Object.keys(monthlyData).sort();

    // Calcular valores acumulados e rentabilidade
    let cumulativeContributions = 0;
    let cumulativeDividends = 0;
    let previousPortfolioValue = 0;

    return sortedMonths.map((month, index) => {
      const data = monthlyData[month];
      cumulativeContributions += data.contributions;
      cumulativeDividends += data.dividends;

      // Calcular valor da carteira no final do mês (simplificado: aportes - saques + proventos)
      const portfolioValue = cumulativeContributions -
        sortedMonths.slice(0, index + 1).reduce((sum, m) => sum + monthlyData[m].withdrawals, 0) +
        cumulativeDividends;

      // Calcular rentabilidade
      const returns = previousPortfolioValue > 0
        ? ((portfolioValue - previousPortfolioValue - data.contributions + data.withdrawals) / previousPortfolioValue) * 100
        : 0;

      previousPortfolioValue = portfolioValue;

      return {
        month,
        portfolioValue,
        contributions: data.contributions,
        withdrawals: data.withdrawals,
        dividends: data.dividends,
        returns,
        cumulativeContributions,
        cumulativeDividends,
      };
    });
  }

  // Obter operações por ativo
  async getOperationsByAsset(
    userId: string,
    asset: string,
  ): Promise<InvestmentOperation[]> {
    return await this.operationsRepository.find({
      where: { userId, asset },
      order: { date: 'ASC', createdAt: 'ASC' },
    });
  }

  // Obter operações por mês
  async getOperationsByMonth(
    userId: string,
    month: string, // "2024-01"
  ): Promise<InvestmentOperation[]> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

    return await this.operationsRepository
      .createQueryBuilder('operation')
      .where('operation.user_id = :userId', { userId })
      .andWhere('operation.date >= :startDate', { startDate: startDate.toISOString().split('T')[0] })
      .andWhere('operation.date <= :endDate', { endDate: endDate.toISOString().split('T')[0] })
      .orderBy('operation.date', 'ASC')
      .addOrderBy('operation.created_at', 'ASC')
      .getMany();
  }

  // Obter tipos de ativos disponíveis
  async getAssetTypes(): Promise<AssetType[]> {
    return await this.assetTypeRepository.find({
      order: { groupName: 'ASC' },
    });
  }

  // Obter exchanges disponíveis
  async getExchanges(): Promise<Exchange[]> {
    return await this.exchangeRepository.find({
      order: { exchangeName: 'ASC' },
    });
  }

  // Popular asset types (seed)
  async seedAssetTypes(assetTypes: Partial<AssetType>[]): Promise<void> {
    const existing = await this.assetTypeRepository.count();
    if (existing === 0) {
      await this.assetTypeRepository.save(
        this.assetTypeRepository.create(assetTypes),
      );
    }
  }

  // Popular exchanges (seed)
  async seedExchanges(exchanges: Partial<Exchange>[]): Promise<void> {
    const existing = await this.exchangeRepository.count();
    if (existing === 0) {
      // Inserir em lotes para melhor performance
      const batchSize = 100;
      for (let i = 0; i < exchanges.length; i += batchSize) {
        const batch = exchanges.slice(i, i + batchSize);
        await this.exchangeRepository.save(
          this.exchangeRepository.create(batch),
        );
      }
    }
  }

  // Popular assets (seed)
  async seedAssets(assets: Partial<Asset>[]): Promise<void> {
    const existing = await this.assetRepository.count();
    if (existing === 0) {
      // Inserir em lotes para melhor performance
      const batchSize = 100;
      for (let i = 0; i < assets.length; i += batchSize) {
        const batch = assets.slice(i, i + batchSize);
        await this.assetRepository.save(
          this.assetRepository.create(batch),
        );
      }
    }
  }

  // Buscar assets da API externa
  async fetchAssetsFromAPI(
    assetSearch: string = '',
    group: string = 'STOCK',
  ): Promise<any[]> {
    try {
      const url = new URL('https://myprofitweb.com/API/Assets');
      if (assetSearch) {
        url.searchParams.append('assetSearch', assetSearch);
      }
      if (group) {
        url.searchParams.append('group', group);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar assets da API:', error);
      throw error;
    }
  }

  // Popular assets no banco a partir da API
  async syncAssetsFromAPI(group: string = 'STOCK'): Promise<number> {
    try {
      const assetsFromAPI = await this.fetchAssetsFromAPI('', group);
      let synced = 0;

      for (const apiAsset of assetsFromAPI) {
        const ticker = apiAsset.Ticker?.trim();
        if (!ticker) continue;

        // Verificar se já existe
        const existing = await this.assetRepository.findOne({
          where: { ticker },
        });

        if (!existing) {
          // Converter data
          let dueDate: Date | null = null;
          if (apiAsset.DueDate) {
            dueDate = new Date(apiAsset.DueDate);
          }

          const asset = this.assetRepository.create({
            assetName: apiAsset.AssetName?.trim() || '',
            ticker,
            alias: apiAsset.Alias?.trim() || null,
            tickerRef: apiAsset.TickerRef?.trim() || null,
            pic: apiAsset.Pic?.trim() || null,
            sector: apiAsset.Sector?.trim() || null,
            subSector: apiAsset.SubSector?.trim() || null,
            typeTax: apiAsset.TypeTax?.trim() || null,
            dueDate,
            index: apiAsset.Index?.trim() || null,
            tax: apiAsset.Tax || 0,
            segment: apiAsset.Segment?.trim() || null,
            assetType: apiAsset.AssetType?.trim() || null,
            cnpj: apiAsset.CNPJ?.trim() || null,
            cnpjAdmin: apiAsset.CNPJAdmin?.trim() || null,
            administrator: apiAsset.Administrator?.trim() || null,
            legalName: apiAsset.LegalName?.trim() || null,
            codeAPI: apiAsset.CodeAPI || null,
            exceptions: apiAsset.Exceptions?.trim() || null,
            market: apiAsset.Market || 0,
            marketString: apiAsset.MarketString?.trim() || null,
            category: apiAsset.Category?.trim() || null,
            exemption: apiAsset.Exemption || false,
            assetGroup: apiAsset.AssetGroup?.trim() || group,
            assetSeries: apiAsset.AssetSeries?.trim() || null,
          });

          await this.assetRepository.save(asset);
          synced++;
        }
      }

      return synced;
    } catch (error) {
      console.error('Erro ao sincronizar assets:', error);
      throw error;
    }
  }

  // Buscar assets da API brapi (não mais do banco)
  async searchAssets(
    search?: string,
    assetGroup?: string,
    limit: number = 50,
  ): Promise<any[]> {
    // Usar ExternalAssetsService que busca diretamente da API brapi
    const myProfitAssets = await this.externalAssetsService.searchAssets(
      search,
      assetGroup || 'STOCK',
      limit,
      0,
    );

    // Converter formato MyProfit (PascalCase) para formato Asset do frontend (camelCase)
    return myProfitAssets.map((asset) => ({
      id: asset.ID,
      assetName: asset.AssetName,
      ticker: asset.Ticker,
      alias: asset.Alias,
      tickerRef: asset.TickerRef,
      pic: asset.Pic,
      sector: asset.Sector,
      subSector: asset.SubSector,
      typeTax: asset.TypeTax,
      dueDate: asset.DueDate,
      index: asset.Index,
      tax: asset.Tax,
      segment: asset.Segment,
      assetType: asset.AssetType,
      cnpj: asset.CNPJ,
      cnpjAdmin: asset.CNPJAdmin,
      administrator: asset.Administrator,
      legalName: asset.LegalName,
      codeAPI: asset.CodeAPI,
      exceptions: asset.Exceptions,
      market: asset.Market,
      marketString: asset.MarketString,
      category: asset.Category,
      exemption: asset.Exemption,
      assetGroup: asset.AssetGroup,
      assetSeries: asset.AssetSeries,
    }));
  }

  // Obter asset por ticker da API brapi
  async getAssetByTicker(ticker: string): Promise<any | null> {
    // Buscar da API brapi
    const assets = await this.externalAssetsService.searchAssets(
      ticker,
      undefined,
      1,
      0,
    );

    const asset = assets.find((a) => a.Ticker === ticker);
    return asset || null;
  }
}
