import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvestmentOperation, OperationType } from './investment-operation.entity';
import { CreateInvestmentOperationDto } from './dto/create-investment-operation.dto';
import { UpdateInvestmentOperationDto } from './dto/update-investment-operation.dto';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(InvestmentOperation)
    private operationsRepository: Repository<InvestmentOperation>,
  ) {}

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

  // Calcular posição atual baseada nas operações
  async getCurrentPosition(userId: string): Promise<
    Array<{
      asset: string;
      assetClass: string;
      quantity: number;
      averagePrice: number;
      currentValue: number; // Quantidade * preço médio de compra
      totalInvested: number;
      profit: number;
      profitPercentage: number;
      portfolioPercentage: number;
      broker: string | null;
      currency: string;
      averageHoldingTime: number; // Dias médios investidos
    }>
  > {
    const operations = await this.findAll(userId);

    // Agrupar por ativo
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

      positions[key].operations.push(op);
      positions[key].brokers.add(op.broker || '');
      positions[key].currencies.add(op.currency);

      if (op.type === OperationType.BUY) {
        positions[key].quantity += op.quantity / 10000; // Converter de centavos
        positions[key].totalInvested += op.totalAmount;
        if (!positions[key].firstBuyDate || op.date < positions[key].firstBuyDate) {
          positions[key].firstBuyDate = op.date;
        }
      } else if (op.type === OperationType.SELL) {
        // Calcular quantidade vendida proporcionalmente
        const sellQuantity = op.quantity / 10000;
        const sellValue = op.totalAmount;
        
        // Reduzir quantidade e ajustar investimento total (FIFO simplificado)
        if (positions[key].quantity > 0) {
          const avgPrice = positions[key].totalInvested / (positions[key].quantity * 100);
          const costBasis = Math.min(sellQuantity, positions[key].quantity) * avgPrice * 100;
          positions[key].quantity = Math.max(0, positions[key].quantity - sellQuantity);
          positions[key].totalInvested = Math.max(0, positions[key].totalInvested - costBasis);
          positions[key].totalSold += sellValue;
        }
      }

      if (!positions[key].lastOperationDate || op.date > positions[key].lastOperationDate) {
        positions[key].lastOperationDate = op.date;
      }
    });

    // Filtrar apenas posições com quantidade > 0
    const activePositions = Object.values(positions).filter((p) => p.quantity > 0);

    // Calcular valores totais
    const totalPortfolioValue = activePositions.reduce(
      (sum, p) => sum + p.totalInvested,
      0,
    );

    // Calcular métricas para cada posição
    return activePositions.map((position) => {
      const averagePrice = position.quantity > 0
        ? position.totalInvested / (position.quantity * 100)
        : 0;
      const currentValue = position.totalInvested; // Usando valor investido como base (pode ser melhorado com cotações atuais)
      const profit = currentValue - position.totalInvested;
      const profitPercentage = position.totalInvested > 0
        ? (profit / position.totalInvested) * 100
        : 0;
      const portfolioPercentage = totalPortfolioValue > 0
        ? (position.totalInvested / totalPortfolioValue) * 100
        : 0;

      // Calcular tempo médio de investimento
      let averageHoldingTime = 0;
      if (position.firstBuyDate && position.lastOperationDate) {
        const diffTime = position.lastOperationDate.getTime() - position.firstBuyDate.getTime();
        averageHoldingTime = Math.round(diffTime / (1000 * 60 * 60 * 24)); // Dias
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
        broker: Array.from(position.brokers).filter((b) => b).join(', ') || null,
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
}
