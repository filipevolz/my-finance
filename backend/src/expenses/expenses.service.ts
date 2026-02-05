import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/category.entity';
import { CardsService } from '../cards/cards.service';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    private categoriesService: CategoriesService,
    private cardsService: CardsService,
  ) {}

  async create(
    userId: string,
    createExpenseDto: CreateExpenseDto,
  ): Promise<Expense> {
    // Converter string YYYY-MM-DD para Date object sem problemas de timezone
    const dateStr = createExpenseDto.date.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const purchaseDate = new Date(year, month - 1, day);

    const installments = createExpenseDto.installments || 1;
    const isParceled = installments > 1 && createExpenseDto.cardId;

    // Se foi pago no cartão, verificar limite disponível
    let card: Awaited<ReturnType<typeof this.cardsService.findOne>> | null = null;
    if (createExpenseDto.cardId) {
      card = await this.cardsService.findOne(
        createExpenseDto.cardId,
        userId,
      );
      
      // Recalcular o limite usado atual (antes de criar esta expense)
      await this.cardsService.recalculateUsedLimit(createExpenseDto.cardId, userId);
      
      // Buscar o cartão novamente para ter o usedLimit atualizado
      const updatedCard = await this.cardsService.findOne(
        createExpenseDto.cardId,
        userId,
      );
      
      // Calcular limite disponível
      const availableLimit = (updatedCard.totalLimit ?? 0) - (updatedCard.usedLimit ?? 0);
      
      if (availableLimit < createExpenseDto.amount) {
        throw new BadRequestException(
          'Limite disponível do cartão insuficiente',
        );
      }
    }

    // Se for parcelado, criar múltiplas despesas com mesmo groupId
    if (isParceled && createExpenseDto.cardId && card) {
      // Gerar um UUID para o grupo
      const groupId = randomUUID();
      const installmentAmount = Math.floor(createExpenseDto.amount / installments);
      const lastInstallmentAmount = createExpenseDto.amount - (installmentAmount * (installments - 1));
      
      const expenses: Expense[] = [];

      // Calcular a data da primeira parcela baseado no fechamento do cartão
      const purchaseDay = purchaseDate.getDate();
      const purchaseMonth = purchaseDate.getMonth();
      const purchaseYear = purchaseDate.getFullYear();

      // Se a compra foi antes do fechamento, a primeira parcela entra no mês atual
      // Se foi depois do fechamento, a primeira parcela entra no próximo mês
      let firstInstallmentMonth = purchaseMonth;
      let firstInstallmentYear = purchaseYear;

      if (purchaseDay > card.closingDate) {
        // Compra depois do fechamento, primeira parcela no próximo mês
        firstInstallmentMonth = purchaseMonth + 1;
        if (firstInstallmentMonth > 11) {
          firstInstallmentMonth = 0;
          firstInstallmentYear = purchaseYear + 1;
        }
      }

      // Criar cada parcela
      for (let i = 0; i < installments; i++) {
        // Calcular mês da parcela
        let installmentMonth = firstInstallmentMonth + i;
        let installmentYear = firstInstallmentYear;

        // Ajustar se passar de dezembro
        while (installmentMonth > 11) {
          installmentMonth -= 12;
          installmentYear += 1;
        }

        // Data de vencimento do cartão no mês da parcela
        const dueDate = new Date(installmentYear, installmentMonth, card.dueDate);
        
        // Valor da parcela (última pode ter diferença de centavos)
        const amount = i === installments - 1 ? lastInstallmentAmount : installmentAmount;

        const expense = this.expensesRepository.create({
          userId,
          name: createExpenseDto.name ? `${createExpenseDto.name} (${i + 1}/${installments})` : null,
          category: createExpenseDto.category,
          amount,
          date: dueDate, // Data de vencimento do cartão
          purchaseDate: purchaseDate, // Data original da compra
          is_paid: false, // Parcelas não são pagas automaticamente
          cardId: createExpenseDto.cardId,
          installments,
          installmentNumber: i + 1,
          groupId, // Todas as parcelas têm o mesmo groupId
        });

        expenses.push(expense);
      }

      // Salvar todas as parcelas
      const savedExpenses = await this.expensesRepository.save(expenses);
      
      // Recalcular o limite usado do cartão após criar as expenses
      if (createExpenseDto.cardId) {
        await this.cardsService.recalculateUsedLimit(createExpenseDto.cardId, userId);
      }
      
      return savedExpenses[0]; // Retornar a primeira parcela
    }

    // Despesa única (não parcelada)
    // Se foi paga no cartão, calcular a data de vencimento baseada no fechamento
    let expenseDate = purchaseDate;
    let expensePurchaseDate: Date | null = null;
    
    if (createExpenseDto.cardId && card) {
      const purchaseDay = purchaseDate.getDate();
      const purchaseMonth = purchaseDate.getMonth();
      const purchaseYear = purchaseDate.getFullYear();

      // Se a compra foi antes ou no dia do fechamento, entra na fatura do mês atual
      // Se foi depois do fechamento, entra na fatura do próximo mês
      let dueMonth = purchaseMonth;
      let dueYear = purchaseYear;

      if (purchaseDay > card.closingDate) {
        // Compra depois do fechamento, vencimento no próximo mês
        dueMonth = purchaseMonth + 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear = purchaseYear + 1;
        }
      }

      // Data de vencimento do cartão
      expenseDate = new Date(dueYear, dueMonth, card.dueDate);
      // Guardar a data original da compra para exibição
      expensePurchaseDate = purchaseDate;
    }

    const expense = this.expensesRepository.create({
      userId,
      name: createExpenseDto.name || null,
      category: createExpenseDto.category,
      amount: createExpenseDto.amount,
      date: expenseDate, // Data de vencimento se for cartão, senão data da compra
      purchaseDate: expensePurchaseDate, // Data original da compra (quando diferente da data de vencimento)
      is_paid: createExpenseDto.is_paid ?? false,
      cardId: createExpenseDto.cardId || null,
      installments: installments > 1 ? installments : null,
      installmentNumber: null,
    });

    const savedExpense = await this.expensesRepository.save(expense);
    
    // Recalcular o limite usado do cartão após criar a expense
    if (createExpenseDto.cardId) {
      await this.cardsService.recalculateUsedLimit(createExpenseDto.cardId, userId);
    }
    
    return savedExpense;
  }

  async findAll(userId: string): Promise<Expense[]> {
    return await this.expensesRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Expense> {
    const expense = await this.expensesRepository.findOne({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Despesa não encontrada');
    }

    if (expense.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta despesa',
      );
    }

    return expense;
  }

  async update(
    id: string,
    userId: string,
    updateExpenseDto: UpdateExpenseDto,
    updateGroup?: boolean,
  ): Promise<Expense> {
    const expense = await this.findOne(id, userId);

    // Se deve atualizar o grupo inteiro e a expense tem groupId
    if (updateGroup && expense.groupId) {
      const groupExpenses = await this.findByGroupId(expense.groupId, userId);
      
      // Atualizar todas as expenses do grupo
      for (const groupExpense of groupExpenses) {
        Object.assign(groupExpense, updateExpenseDto);

        if (updateExpenseDto.date) {
          // Para expenses parceladas, ajustar a data baseado no installmentNumber
          const dateStr = updateExpenseDto.date.split('T')[0];
          const [year, month, day] = dateStr.split('-').map(Number);
          const baseDate = new Date(year, month - 1, day);
          
          // Se for parcelada, manter a lógica de datas das parcelas
          if (groupExpense.installments && groupExpense.installmentNumber) {
            // Manter a data original da parcela (não alterar)
            // Ou implementar lógica para recalcular datas das parcelas
            // Por enquanto, não alteramos a data de parcelas
          } else {
            groupExpense.date = baseDate;
          }
        }

        await this.expensesRepository.save(groupExpense);
      }

      return expense; // Retornar a expense original
    }

    // Atualização individual
    const oldCardId = expense.cardId;
    const oldAmount = expense.amount;
    
    // Determinar o novo cardId - se foi enviado no DTO (mesmo que null), usar o valor do DTO
    // Se não foi enviado, manter o valor atual
    let newCardId: string | null | undefined;
    if (updateExpenseDto.hasOwnProperty('cardId')) {
      newCardId = updateExpenseDto.cardId ?? null;
    } else {
      newCardId = expense.cardId;
    }
    
    const newAmount = updateExpenseDto.amount !== undefined ? updateExpenseDto.amount : expense.amount;

    // Normalizar para comparação (null e undefined são tratados como "sem cartão")
    const oldCardIdNormalized = oldCardId ?? null;
    const newCardIdNormalized = newCardId ?? null;

    // Se mudou o cartão ou o valor, verificar limite antes de atualizar
    const cardChanged = oldCardIdNormalized !== newCardIdNormalized;
    const amountChanged = oldAmount !== newAmount;
    
    if (cardChanged || amountChanged) {
      // Se agora tem cartão, verificar limite disponível ANTES de atualizar
      if (newCardIdNormalized) {
        const newCard = await this.cardsService.findOne(newCardIdNormalized, userId);
        
        // Recalcular o limite usado atual (sem incluir esta expense ainda)
        await this.cardsService.recalculateUsedLimit(newCardIdNormalized, userId);
        
        // Buscar o cartão novamente para ter o usedLimit atualizado
        const updatedCard = await this.cardsService.findOne(newCardIdNormalized, userId);
        
        // Calcular limite disponível
        const availableLimit = (updatedCard.totalLimit ?? 0) - (updatedCard.usedLimit ?? 0);
        
        if (availableLimit < newAmount) {
          throw new BadRequestException(
            'Limite disponível do cartão insuficiente',
          );
        }
      }
    }

    // Atualizar a expense primeiro
    Object.assign(expense, updateExpenseDto);

    // Se a data foi atualizada ou o cartão mudou, recalcular a data de vencimento se tiver cartão
    if (updateExpenseDto.date || cardChanged) {
      // Converter string YYYY-MM-DD para Date object sem problemas de timezone
      const dateStr = (updateExpenseDto.date || expense.date.toISOString().split('T')[0]).split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const purchaseDate = new Date(year, month - 1, day);

      // Se tem cartão, calcular data de vencimento baseada no fechamento
      if (newCardIdNormalized) {
        const card = await this.cardsService.findOne(newCardIdNormalized, userId);
        const purchaseDay = purchaseDate.getDate();
        const purchaseMonth = purchaseDate.getMonth();
        const purchaseYear = purchaseDate.getFullYear();

        // Se a compra foi antes ou no dia do fechamento, entra na fatura do mês atual
        // Se foi depois do fechamento, entra na fatura do próximo mês
        let dueMonth = purchaseMonth;
        let dueYear = purchaseYear;

        if (purchaseDay > card.closingDate) {
          // Compra depois do fechamento, vencimento no próximo mês
          dueMonth = purchaseMonth + 1;
          if (dueMonth > 11) {
            dueMonth = 0;
            dueYear = purchaseYear + 1;
          }
        }

        // Data de vencimento do cartão
        expense.date = new Date(dueYear, dueMonth, card.dueDate);
        // Guardar a data original da compra para exibição
        expense.purchaseDate = purchaseDate;
      } else {
        // Se não tem cartão, usar a data da compra
        expense.date = purchaseDate;
        expense.purchaseDate = null; // Limpar purchaseDate quando não tem cartão
      }
    }

    // Salvar a expense primeiro
    const savedExpense = await this.expensesRepository.save(expense);

    // Depois de salvar, recalcular os limites dos cartões afetados
    if (cardChanged || amountChanged) {
      // Se tinha cartão antes (e mudou), recalcular o limite usado do cartão antigo
      if (oldCardIdNormalized && oldCardIdNormalized !== newCardIdNormalized) {
        await this.cardsService.recalculateUsedLimit(oldCardIdNormalized, userId);
      }

      // Se agora tem cartão, recalcular o limite usado do cartão novo
      if (newCardIdNormalized) {
        await this.cardsService.recalculateUsedLimit(newCardIdNormalized, userId);
      }
    }

    return savedExpense;
  }

  async findByGroupId(groupId: string, userId: string): Promise<Expense[]> {
    return await this.expensesRepository.find({
      where: { groupId, userId },
      order: { installmentNumber: 'ASC' },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const expense = await this.findOne(id, userId);
    const cardId = expense.cardId;
    
    // Remover a expense primeiro
    await this.expensesRepository.remove(expense);
    
    // Depois, recalcular o limite usado do cartão (se tinha cartão)
    if (cardId) {
      await this.cardsService.recalculateUsedLimit(cardId, userId);
    }
  }

  async removeGroup(groupId: string, userId: string): Promise<void> {
    const expenses = await this.findByGroupId(groupId, userId);
    
    if (expenses.length === 0) {
      throw new NotFoundException('Grupo de despesas não encontrado');
    }

    const cardId = expenses[0].cardId;
    
    // Remover as expenses primeiro
    await this.expensesRepository.remove(expenses);
    
    // Depois, recalcular o limite usado do cartão (se tinha cartão)
    if (cardId) {
      await this.cardsService.recalculateUsedLimit(cardId, userId);
    }
  }

  async findByCategory(userId: string, category: string): Promise<Expense[]> {
    return await this.expensesRepository.find({
      where: { userId, category },
      order: { date: 'DESC' },
    });
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Expense[]> {
    // Formatar datas para YYYY-MM-DD (formato esperado pelo PostgreSQL date)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    return await this.expensesRepository
      .createQueryBuilder('expense')
      .where('expense.user_id = :userId', { userId })
      .andWhere('expense.date >= :startDate', { startDate: startDateStr })
      .andWhere('expense.date <= :endDate', { endDate: endDateStr })
      .orderBy('expense.date', 'DESC')
      .getMany();
  }

  async findByPeriod(
    userId: string,
    period: 'this-month' | 'last-month' | 'this-year' | 'last-12-months',
  ): Promise<Expense[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'this-month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // Último dia do mês atual
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      }
      case 'last-month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth;
        // Último dia do mês passado
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case 'this-year': {
        startDate = new Date(now.getFullYear(), 0, 1);
        // Último dia do ano atual
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      }
      case 'last-12-months': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        // Data atual (último dia do período)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
    }

    // Ajustar para incluir todo o dia final
    endDate.setHours(23, 59, 59, 999);

    return await this.findByDateRange(userId, startDate, endDate);
  }

  async getStats(
    userId: string,
    period?: 'this-month' | 'last-month' | 'this-year' | 'last-12-months',
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    // Buscar despesas do período atual
    let currentExpenses: Expense[];
    if (startDate && endDate) {
      currentExpenses = await this.findByDateRange(userId, startDate, endDate);
    } else if (period) {
      currentExpenses = await this.findByPeriod(userId, period);
    } else {
      currentExpenses = await this.findAll(userId);
    }
    const currentExpense = currentExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    return currentExpense;
  }

  async getByCategory(
    userId: string,
    period?: 'this-month' | 'last-month' | 'this-year' | 'last-12-months',
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    Array<{
      name: string;
      percentage: number;
      color: string;
      icon: string | null;
      value: number;
    }>
  > {
    let expenses: Expense[];
    if (startDate && endDate) {
      expenses = await this.findByDateRange(userId, startDate, endDate);
    } else if (period) {
      expenses = await this.findByPeriod(userId, period);
    } else {
      expenses = await this.findAll(userId);
    }
    const totalExpense = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0,
    );

    // Agrupar por categoria
    const categoryMap = new Map<
      string,
      { amount: number; icon: string | null }
    >();

    for (const expense of expenses) {
      const existing = categoryMap.get(expense.category);
      if (existing) {
        existing.amount += Number(expense.amount);
      } else {
        categoryMap.set(expense.category, {
          amount: Number(expense.amount),
          icon: null,
        });
      }
    }

    // Buscar informações das categorias (incluindo ícones)
    const categories = await this.categoriesService.findAll(CategoryType.EXPENSE);
    const categoryInfoMap = new Map(
      categories.map((cat) => [cat.name, { icon: cat.icon, color: '' }]),
    );

    // Cores pré-definidas para o gráfico
    const colors = [
      '#9333ea',
      '#ef4444',
      '#60a5fa',
      '#4ade80',
      '#f97316',
      '#f59e0b',
      '#ec4899',
      '#8b5cf6',
      '#06b6d4',
      '#84cc16',
    ];

    // Converter para array e calcular porcentagens
    const result = Array.from(categoryMap.entries())
      .map(([name, data], index) => {
        const categoryInfo = categoryInfoMap.get(name);
        const percentage =
          totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0;

        return {
          name,
          percentage: Math.round(percentage * 100) / 100, // 2 casas decimais
          color: colors[index % colors.length],
          icon: categoryInfo?.icon || null,
          value: data.amount,
        };
      })
      .sort((a, b) => b.value - a.value) // Ordenar por valor (maior primeiro)
      .slice(0, 10); // Limitar a 10 categorias

    return result;
  }
}
