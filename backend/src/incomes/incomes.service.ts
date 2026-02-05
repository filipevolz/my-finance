import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Income } from './income.entity';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { ExpensesService } from '../expenses/expenses.service';
import { Expense } from '../expenses/expense.entity';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/category.entity';
import { dateOnlyToString } from 'src/helpers/dateOnlyToString';

@Injectable()
export class IncomesService {
  constructor(
    @InjectRepository(Income)
    private incomesRepository: Repository<Income>,
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    @Inject(forwardRef(() => ExpensesService))
    private expensesService: ExpensesService,
    private categoriesService: CategoriesService,
  ) {}

  // Função helper para normalizar texto (remover acentos e converter para minúsculas)
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  async create(
    userId: string,
    createIncomeDto: CreateIncomeDto,
  ): Promise<Income[]> {
    const { name, category, amount, date, isRecurring } = createIncomeDto;

    // Converter string YYYY-MM-DD para Date object sem problemas de timezone
    const dateStr = date.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);

    if (isRecurring) {
      // Criar 12 receitas recorrentes (uma para cada mês)
      const recurringGroupId = uuidv4();
      const incomes: Income[] = [];

      for (let i = 0; i < 12; i++) {
        const incomeDate = new Date(year, month - 1 + i, day);

        const income = this.incomesRepository.create({
          userId,
          name,
          category,
          amount,
          date: incomeDate,
          isRecurring: true,
          recurringGroupId,
        });

        incomes.push(income);
      }

      return await this.incomesRepository.save(incomes);
    } else {
      // Criar uma única receita
      const income = this.incomesRepository.create({
        userId,
        name,
        category,
        amount,
        date: baseDate,
        isRecurring: false,
        recurringGroupId: null,
      });

      return [await this.incomesRepository.save(income)];
    }
  }

  async findAll(userId: string): Promise<Income[]> {
    return await this.incomesRepository.find({
      where: { userId },
      order: { date: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Income> {
    const income = await this.incomesRepository.findOne({
      where: { id },
    });

    if (!income) {
      throw new NotFoundException('Receita não encontrada');
    }

    if (income.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar esta receita',
      );
    }

    return income;
  }

  async update(
    id: string,
    userId: string,
    updateIncomeDto: UpdateIncomeDto,
  ): Promise<Income> {
    const income = await this.findOne(id, userId);

    // Se a receita for recorrente, atualizar apenas esta instância
    // (não afeta as outras receitas do grupo)
    Object.assign(income, updateIncomeDto);

    if (updateIncomeDto.date) {
      // Converter string YYYY-MM-DD para Date object sem problemas de timezone
      const dateStr = updateIncomeDto.date.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      income.date = new Date(year, month - 1, day);
    }

    return await this.incomesRepository.save(income);
  }

  async remove(id: string, userId: string): Promise<void> {
    const income = await this.findOne(id, userId);
    await this.incomesRepository.remove(income);
  }

  async findByCategory(userId: string, category: string): Promise<Income[]> {
    return await this.incomesRepository.find({
      where: { userId, category },
      order: { date: 'DESC' },
    });
  }

  async findByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Income[]> {
    // Formatar datas para YYYY-MM-DD (formato esperado pelo PostgreSQL date)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const result = await this.incomesRepository
      .createQueryBuilder('income')
      .where('income.user_id = :userId', { userId })
      .andWhere('income.date >= :startDate', { startDate: startDateStr })
      .andWhere('income.date <= :endDate', { endDate: endDateStr })
      .orderBy('income.date', 'DESC')
      .getMany();

    // Verificar quantos registros existem para esse userId sem filtro de data
    const totalForUser = await this.incomesRepository.count({
      where: { userId },
    });

    return result;
  }

  async findByPeriod(
    userId: string,
    period: 'this-month' | 'last-month' | 'this-year' | 'last-12-months',
  ): Promise<Income[]> {
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
  ): Promise<{
    balance: number;
    balanceChange: number;
    income: number;
    incomeChange: number;
    expense: number;
    expenseChange: number;
  }> {
    // Buscar receitas do período atual
    let currentIncomes: Income[];
    if (startDate && endDate) {
      currentIncomes = await this.findByDateRange(userId, startDate, endDate);
    } else if (period) {
      currentIncomes = await this.findByPeriod(userId, period);
    } else {
      currentIncomes = await this.findAll(userId);
    }
    const currentIncome = currentIncomes.reduce(
      (sum, income) => sum + Number(income.amount),
      0,
    );

    // Se não houver período ou for range customizado, não calcular mudanças percentuais
    if (!period || (startDate && endDate)) {
      const currentExpense = await this.expensesService.getStats(
        userId,
        period,
        startDate,
        endDate,
      );
      const balance = currentIncome - currentExpense;
      return {
        balance,
        balanceChange: 0,
        income: currentIncome,
        incomeChange: 0,
        expense: currentExpense,
        expenseChange: 0,
      };
    }

    // Buscar receitas do período anterior para comparação
    let previousIncome = 0;
    let previousPeriod:
      | 'this-month'
      | 'last-month'
      | 'this-year'
      | 'last-12-months'
      | null = null;

    switch (period) {
      case 'this-month': {
        previousPeriod = 'last-month';
        break;
      }
      case 'last-month': {
        // Comparar com mês anterior ao last-month (2 meses atrás)
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        const previousMonthStart = new Date(
          twoMonthsAgo.getFullYear(),
          twoMonthsAgo.getMonth(),
          1,
        );
        const previousMonthEnd = new Date(
          twoMonthsAgo.getFullYear(),
          twoMonthsAgo.getMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        );
        const previousMonthIncomes = await this.findByDateRange(
          userId,
          previousMonthStart,
          previousMonthEnd,
        );
        previousIncome = previousMonthIncomes.reduce(
          (sum, income) => sum + Number(income.amount),
          0,
        );
        break;
      }
      case 'this-year': {
        // Comparar com ano anterior
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        const lastYearIncomes = await this.findByDateRange(
          userId,
          new Date(lastYear.getFullYear(), 0, 1),
          new Date(lastYear.getFullYear(), 11, 31, 23, 59, 59, 999),
        );
        previousIncome = lastYearIncomes.reduce(
          (sum, income) => sum + Number(income.amount),
          0,
        );
        break;
      }
      case 'last-12-months': {
        // Comparar com os 12 meses anteriores aos últimos 12 meses
        const now = new Date();
        const previous12MonthsStart = new Date(
          now.getFullYear(),
          now.getMonth() - 23,
          1,
        );
        const previous12MonthsEnd = new Date(
          now.getFullYear(),
          now.getMonth() - 12,
          0,
          23,
          59,
          59,
          999,
        );
        const previous12MonthsIncomes = await this.findByDateRange(
          userId,
          previous12MonthsStart,
          previous12MonthsEnd,
        );
        previousIncome = previous12MonthsIncomes.reduce(
          (sum, income) => sum + Number(income.amount),
          0,
        );
        break;
      }
    }

    if (previousPeriod) {
      const previousIncomes = await this.findByPeriod(userId, previousPeriod);
      previousIncome = previousIncomes.reduce(
        (sum, income) => sum + Number(income.amount),
        0,
      );
    }

    // Calcular percentual de mudança
    const incomeChange =
      previousIncome === 0
        ? currentIncome > 0
          ? 100
          : 0
        : ((currentIncome - previousIncome) / previousIncome) * 100;

    // Buscar despesas do período atual
    const currentExpense = await this.expensesService.getStats(userId, period);

    // Buscar despesas do período anterior
    let previousExpense = 0;
    if (previousPeriod) {
      previousExpense = await this.expensesService.getStats(
        userId,
        previousPeriod,
      );
    } else {
      // Para casos especiais (last-month, this-year, last-12-months)
      let previousStartDate: Date;
      let previousEndDate: Date;

      switch (period) {
        case 'last-month': {
          const twoMonthsAgo = new Date();
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
          previousStartDate = new Date(
            twoMonthsAgo.getFullYear(),
            twoMonthsAgo.getMonth(),
            1,
          );
          previousEndDate = new Date(
            twoMonthsAgo.getFullYear(),
            twoMonthsAgo.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
          const previousExpenses = await this.expensesService.findByDateRange(
            userId,
            previousStartDate,
            previousEndDate,
          );
          previousExpense = previousExpenses.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0,
          );
          break;
        }
        case 'this-year': {
          const lastYear = new Date();
          lastYear.setFullYear(lastYear.getFullYear() - 1);
          const lastYearExpenses = await this.expensesService.findByDateRange(
            userId,
            new Date(lastYear.getFullYear(), 0, 1),
            new Date(lastYear.getFullYear(), 11, 31, 23, 59, 59, 999),
          );
          previousExpense = lastYearExpenses.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0,
          );
          break;
        }
        case 'last-12-months': {
          const now2 = new Date();
          const previous12MonthsStart = new Date(
            now2.getFullYear(),
            now2.getMonth() - 23,
            1,
          );
          const previous12MonthsEnd = new Date(
            now2.getFullYear(),
            now2.getMonth() - 12,
            0,
            23,
            59,
            59,
            999,
          );
          const previous12MonthsExpenses =
            await this.expensesService.findByDateRange(
              userId,
              previous12MonthsStart,
              previous12MonthsEnd,
            );
          previousExpense = previous12MonthsExpenses.reduce(
            (sum, expense) => sum + Number(expense.amount),
            0,
          );
          break;
        }
      }
    }

    // Calcular percentual de mudança de despesas
    const expenseChange =
      previousExpense === 0
        ? currentExpense > 0
          ? 100
          : 0
        : ((currentExpense - previousExpense) / previousExpense) * 100;

    // Balance é income - expense
    const balance = currentIncome - currentExpense;
    const previousBalance = previousIncome - previousExpense;
    const balanceChange =
      previousBalance === 0
        ? balance > 0
          ? 100
          : 0
        : ((balance - previousBalance) / previousBalance) * 100;

    return {
      balance,
      balanceChange: Math.round(balanceChange * 100) / 100,
      income: currentIncome,
      incomeChange: Math.round(incomeChange * 100) / 100,
      expense: currentExpense,
      expenseChange: Math.round(expenseChange * 100) / 100,
    };
  }

  async getLatestTransactions(
    userId: string,
    limit: number = 10,
  ): Promise<
    Array<{
      id: string;
      description: string;
      categoryIcon: string;
      category: string;
      date: string;
      purchaseDate?: string | null;
      amount: number;
      type: 'income' | 'expense';
      is_paid?: boolean;
    }>
  > {
    // Buscar todas as categorias para mapear ícones
    const allCategories = await this.categoriesService.findAll();
    const categoryMap = new Map<string, string>(
      allCategories
        .filter((cat) => cat.icon !== null)
        .map((cat) => [cat.name, cat.icon as string]),
    );

    // Buscar últimas receitas ordenadas por createdAt
    const incomes = await this.incomesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    // Buscar últimas despesas ordenadas por createdAt
    const expenses = await this.expensesRepository
      .createQueryBuilder('expense')
      .where('expense.user_id = :userId', { userId })
      .orderBy('expense.created_at', 'DESC')
      .limit(limit)
      .getMany();

    // Converter para formato unificado
    const incomeTransactions = incomes.map((income) => {
      const dateStr = dateOnlyToString(income.date);
      const categoryIcon: string = categoryMap.get(income.category) || '💰';

      return {
        id: income.id,
        description: income.name || income.category, // Usar o nome do income ou categoria como fallback
        categoryIcon,
        category: income.category,
        date: dateStr,
        amount: Number(income.amount),
        type: 'income' as const,
        createdAt: income.createdAt,
      };
    });

    const expenseTransactions = expenses.map((expense) => {
      const dateStr = dateOnlyToString(expense.date);
      const purchaseDateStr = expense.purchaseDate 
        ? dateOnlyToString(expense.purchaseDate) 
        : null;
      const categoryIcon: string = categoryMap.get(expense.category) || '💰';

      return {
        id: expense.id,
        description: expense.name || expense.category, // Usar o nome do expense ou categoria como fallback
        categoryIcon,
        category: expense.category,
        date: dateStr, // Data de vencimento/pagamento (para filtros)
        purchaseDate: purchaseDateStr, // Data original da compra (para exibição)
        amount: Number(expense.amount),
        type: 'expense' as const,
        createdAt: expense.createdAt,
        is_paid: expense.is_paid,
      };
    });

    // Combinar e ordenar por createdAt (data de criação)
    const allTransactionsWithCreatedAt = [
      ...incomeTransactions,
      ...expenseTransactions,
    ];

    const allTransactions = allTransactionsWithCreatedAt
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
      })
      .slice(0, limit)
      .map(({ createdAt, ...trans }) => trans); // Remover createdAt do resultado final

    return allTransactions;
  }

  async getTransactions(
    userId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      category?: string;
      minAmount?: number;
      maxAmount?: number;
      description?: string;
      period?: 'this-month' | 'last-month' | 'this-year' | 'last-12-months';
      month?: number;
      year?: number;
      type?: 'income' | 'expense';
    },
  ): Promise<
    Array<{
      id: string;
      description: string;
      categoryIcon: string;
      category: string;
      date: string;
      purchaseDate?: string | null;
      amount: number;
      type: 'income' | 'expense';
      is_paid?: boolean;
    }>
  > {
    // Buscar todas as categorias para mapear ícones
    const allCategories = await this.categoriesService.findAll();
    const categoryMap = new Map<string, string>(
      allCategories
        .filter((cat) => cat.icon !== null)
        .map((cat) => [cat.name, cat.icon as string]),
    );

    // Determinar range de datas
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (filters.startDate && filters.endDate) {
      startDate = filters.startDate;
      endDate = filters.endDate;
    } else if (filters.period) {
      const periodDates = this.getPeriodDates(filters.period);
      startDate = periodDates.startDate;
      endDate = periodDates.endDate;
    } else if (filters.month && filters.year) {
      startDate = new Date(filters.year, filters.month - 1, 1);
      endDate = new Date(filters.year, filters.month, 0, 23, 59, 59, 999);
    } else if (filters.year) {
      startDate = new Date(filters.year, 0, 1);
      endDate = new Date(filters.year, 11, 31, 23, 59, 59, 999);
    }

    // Buscar receitas
    let incomes: Income[] = [];
    if (!filters.type || filters.type === 'income') {
      const incomesQuery = this.incomesRepository
        .createQueryBuilder('income')
        .where('income.user_id = :userId', { userId });

      if (startDate && endDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        incomesQuery
          .andWhere('income.date >= :startDate', { startDate: startDateStr })
          .andWhere('income.date <= :endDate', { endDate: endDateStr });
      }

      if (filters.category) {
        incomesQuery.andWhere('income.category = :category', {
          category: filters.category,
        });
      }

      if (filters.minAmount !== undefined) {
        incomesQuery.andWhere('income.amount >= :minAmount', {
          minAmount: filters.minAmount,
        });
      }

      if (filters.maxAmount !== undefined) {
        incomesQuery.andWhere('income.amount <= :maxAmount', {
          maxAmount: filters.maxAmount,
        });
      }

      if (filters.description) {
        // Normalizar o texto de busca para ignorar acentos e case
        const normalizedSearch = this.normalizeText(filters.description);
        // Usar TRANSLATE para remover acentos de forma eficiente (função nativa do PostgreSQL)
        incomesQuery.andWhere(
          `LOWER(TRANSLATE(income.name, 'áàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ', 'aaaaeeiooouucAAAAEEIOOOUUC')) LIKE LOWER(:description)`,
          {
            description: `%${normalizedSearch}%`,
          },
        );
      }

      incomes = await incomesQuery
        .orderBy('income.date', 'ASC')
        .addOrderBy('income.created_at', 'ASC')
        .getMany();
    }

    // Buscar despesas
    let expenses: Expense[] = [];
    if (!filters.type || filters.type === 'expense') {
      const expensesQuery = this.expensesRepository
        .createQueryBuilder('expense')
        .where('expense.user_id = :userId', { userId });

      if (startDate && endDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        expensesQuery
          .andWhere('expense.date >= :startDate', { startDate: startDateStr })
          .andWhere('expense.date <= :endDate', { endDate: endDateStr });
      }

      if (filters.category) {
        expensesQuery.andWhere('expense.category = :category', {
          category: filters.category,
        });
      }

      if (filters.minAmount !== undefined) {
        expensesQuery.andWhere('expense.amount >= :minAmount', {
          minAmount: filters.minAmount,
        });
      }

      if (filters.maxAmount !== undefined) {
        expensesQuery.andWhere('expense.amount <= :maxAmount', {
          maxAmount: filters.maxAmount,
        });
      }

      if (filters.description) {
        // Normalizar o texto de busca para ignorar acentos e case
        const normalizedSearch = this.normalizeText(filters.description);
        // Buscar usando função que normaliza texto (remove acentos)
        // Usar translate para remover acentos de forma mais eficiente
        expensesQuery.andWhere(
          `LOWER(TRANSLATE(expense.name, 'áàãâéêíóôõúüçÁÀÃÂÉÊÍÓÔÕÚÜÇ', 'aaaaeeiooouucAAAAEEIOOOUUC')) LIKE LOWER(:description)`,
          {
            description: `%${normalizedSearch}%`,
          },
        );
      }

      expenses = await expensesQuery
        .orderBy('expense.date', 'ASC')
        .addOrderBy('expense.created_at', 'ASC')
        .getMany();
    }

    // Converter para formato unificado
    const incomeTransactions = incomes.map((income) => {
      const dateStr = dateOnlyToString(income.date);
      const categoryIcon: string = categoryMap.get(income.category) || '💰';

      return {
        id: income.id,
        description: income.name || income.category,
        categoryIcon,
        category: income.category,
        date: dateStr,
        amount: Number(income.amount),
        type: 'income' as const,
      };
    });

    const expenseTransactions = expenses.map((expense) => {
      const dateStr = dateOnlyToString(expense.date);
      const purchaseDateStr = expense.purchaseDate 
        ? dateOnlyToString(expense.purchaseDate) 
        : null;
      const categoryIcon: string = categoryMap.get(expense.category) || '💰';

      return {
        id: expense.id,
        description: expense.name || expense.category,
        categoryIcon,
        category: expense.category,
        date: dateStr, // Data de vencimento/pagamento (para filtros)
        purchaseDate: purchaseDateStr, // Data original da compra (para exibição)
        amount: Number(expense.amount),
        type: 'expense' as const,
        is_paid: expense.is_paid,
      };
    });

    // Combinar e ordenar por data (mais antiga primeiro)
    const allTransactions = [...incomeTransactions, ...expenseTransactions]
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        // Ordenar por data crescente (mais antiga primeiro)
        // Se as datas forem iguais, ordenar por ID para manter consistência
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        return a.id.localeCompare(b.id);
      });

    return allTransactions;
  }

  private getPeriodDates(period: 'this-month' | 'last-month' | 'this-year' | 'last-12-months'): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'this-month': {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      }
      case 'last-month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth;
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      }
      case 'this-year': {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      }
      case 'last-12-months': {
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      }
    }

    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Método para obter evolução mensal (para analytics)
  async getMonthlyEvolution(
    userId: string,
    months: number = 12,
  ): Promise<
    Array<{
      month: string; // "2024-01"
      income: number;
      expense: number;
      balance: number;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1); // Primeiro dia do mês

    // Buscar todas as receitas e despesas no período
    const incomes = await this.findByDateRange(userId, startDate, endDate);
    const expenses = await this.expensesService.findByDateRange(
      userId,
      startDate,
      endDate,
    );

    // Agrupar por mês
    const monthlyData: Record<
      string,
      { income: number; expense: number }
    > = {};

    // Inicializar todos os meses com zero
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { income: 0, expense: 0 };
    }

    // Processar receitas
    incomes.forEach((income) => {
      const date = new Date(income.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].income += Number(income.amount);
      }
    });

    // Processar despesas
    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].expense += Number(expense.amount);
      }
    });

    // Converter para array e calcular balance
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  // Método para análise de gastos por categoria com evolução
  async getCategoryExpenseAnalysis(
    userId: string,
    months: number = 6,
  ): Promise<
    Array<{
      category: string;
      averageMonthly: number;
      lastMonth: number;
      variation: number; // percentual
      mostExpensiveMonth: { month: string; value: number };
      icon: string | null;
      color: string;
    }>
  > {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months + 1);
    startDate.setDate(1);

    const expenses = await this.expensesService.findByDateRange(
      userId,
      startDate,
      endDate,
    );

    // Agrupar por categoria
    const categoryData: Record<
      string,
      {
        values: Array<{ month: string; value: number }>;
        icon: string | null;
        color: string;
      }
    > = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const category = expense.category;

      if (!categoryData[category]) {
        categoryData[category] = {
          values: [],
          icon: null,
          color: '#8884d8',
        };
      }

      const existing = categoryData[category].values.find(
        (v) => v.month === monthKey,
      );
      if (existing) {
        existing.value += Number(expense.amount);
      } else {
        categoryData[category].values.push({
          month: monthKey,
          value: Number(expense.amount),
        });
      }
    });

    // Buscar informações de categoria (ícone)
    const categories = await this.categoriesService.findAll(CategoryType.EXPENSE);
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
    let colorIndex = 0;
    categories.forEach((cat) => {
      if (categoryData[cat.name]) {
        categoryData[cat.name].icon = cat.icon;
        categoryData[cat.name].color = colors[colorIndex % colors.length];
        colorIndex++;
      }
    });

    // Calcular estatísticas
    return Object.entries(categoryData).map(([category, data]) => {
      const values = data.values.map((v) => v.value);
      const averageMonthly =
        values.reduce((sum, v) => sum + v, 0) / Math.max(values.length, 1);
      const lastMonth = values[values.length - 1] || 0;
      const previousMonth = values[values.length - 2] || 0;
      const variation =
        previousMonth > 0
          ? ((lastMonth - previousMonth) / previousMonth) * 100
          : 0;

      const mostExpensiveMonth = data.values.reduce(
        (max, current) => (current.value > max.value ? current : max),
        { month: data.values[0]?.month || '', value: 0 },
      );

      return {
        category,
        averageMonthly,
        lastMonth,
        variation,
        mostExpensiveMonth: {
          month: mostExpensiveMonth.month,
          value: mostExpensiveMonth.value,
        },
        icon: data.icon,
        color: data.color,
      };
    });
  }

  // Método para detectar gastos recorrentes
  async getRecurringExpenses(userId: string): Promise<
    Array<{
      name: string;
      amount: number;
      frequency: string; // "monthly", "weekly", etc
      annualImpact: number;
      category: string;
    }>
  > {
    const allExpenses = await this.expensesService.findAll(userId);

    // Agrupar por nome e categoria
    const expenseGroups: Record<
      string,
      {
        name: string;
        category: string;
        amounts: number[];
        dates: Date[];
      }
    > = {};

    allExpenses.forEach((expense) => {
      if (!expense.name) return; // Ignorar despesas sem nome
      const key = `${expense.name.toLowerCase()}_${expense.category}`;
      if (!expenseGroups[key]) {
        expenseGroups[key] = {
          name: expense.name,
          category: expense.category,
          amounts: [],
          dates: [],
        };
      }
      expenseGroups[key].amounts.push(Number(expense.amount));
      expenseGroups[key].dates.push(new Date(expense.date));
    });

    // Detectar recorrência (mesmo valor, intervalo similar)
    const recurring: Array<{
      name: string;
      amount: number;
      frequency: string;
      annualImpact: number;
      category: string;
    }> = [];

    Object.values(expenseGroups).forEach((group) => {
      if (group.amounts.length < 2) return;

      // Verificar se os valores são similares (variação < 10%)
      const avgAmount =
        group.amounts.reduce((sum, a) => sum + a, 0) / group.amounts.length;
      const isSimilar = group.amounts.every(
        (a) => Math.abs(a - avgAmount) / avgAmount < 0.1,
      );

      if (isSimilar) {
        // Calcular frequência média
        group.dates.sort((a, b) => a.getTime() - b.getTime());
        const intervals: number[] = [];
        for (let i = 1; i < group.dates.length; i++) {
          const diff = group.dates[i].getTime() - group.dates[i - 1].getTime();
          intervals.push(diff / (1000 * 60 * 60 * 24)); // dias
        }
        const avgInterval =
          intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

        let frequency = 'monthly';
        if (avgInterval <= 7) frequency = 'weekly';
        else if (avgInterval <= 14) frequency = 'biweekly';
        else if (avgInterval <= 35) frequency = 'monthly';
        else frequency = 'irregular';

        const annualImpact =
          frequency === 'weekly'
            ? avgAmount * 52
            : frequency === 'biweekly'
              ? avgAmount * 26
              : frequency === 'monthly'
                ? avgAmount * 12
                : avgAmount * 6; // irregular estimado

        recurring.push({
          name: group.name,
          amount: avgAmount,
          frequency,
          annualImpact,
          category: group.category,
        });
      }
    });

    return recurring.sort((a, b) => b.annualImpact - a.annualImpact);
  }

  // Método para análise de fontes de receita
  async getIncomeSourcesAnalysis(userId: string): Promise<{
    sources: Array<{
      category: string;
      name: string | null;
      sourceLabel: string; // Nome da fonte (nome + categoria ou apenas categoria)
      total: number;
      percentage: number;
      count: number;
    }>;
    totalIncome: number;
    mainSourcePercentage: number;
    sourceCount: number;
  }> {
    const incomes = await this.findAll(userId);
    const totalIncome = incomes.reduce(
      (sum, income) => sum + Number(income.amount),
      0,
    );

    // Agrupar por nome + categoria (ou apenas categoria se não tiver nome)
    // Isso permite distinguir "Meet Med - Salário" de "Fortis - Salário"
    const sourceGroups: Record<
      string,
      {
        category: string;
        name: string | null;
        sourceLabel: string;
        total: number;
        count: number;
      }
    > = {};

    incomes.forEach((income) => {
      // Criar chave única: se tem nome, usa "nome - categoria", senão usa apenas categoria
      const sourceKey = income.name
        ? `${income.name.toLowerCase().trim()}_${income.category}`
        : income.category;

      // Criar label para exibição
      const sourceLabel = income.name
        ? `${income.name} - ${income.category}`
        : income.category;

      if (!sourceGroups[sourceKey]) {
        sourceGroups[sourceKey] = {
          category: income.category,
          name: income.name,
          sourceLabel,
          total: 0,
          count: 0,
        };
      }
      sourceGroups[sourceKey].total += Number(income.amount);
      sourceGroups[sourceKey].count += 1;
    });

    const sources = Object.values(sourceGroups)
      .map((data) => ({
        category: data.category,
        name: data.name,
        sourceLabel: data.sourceLabel,
        total: data.total,
        percentage: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);

    const mainSourcePercentage = sources[0]?.percentage || 0;

    return {
      sources,
      totalIncome,
      mainSourcePercentage,
      sourceCount: sources.length,
    };
  }

  // Método para padrão de consumo (heatmap)
  async getConsumptionPattern(
    userId: string,
    months: number = 3,
  ): Promise<{
    byDayOfWeek: Array<{ day: string; total: number; count: number }>;
    byDayOfMonth: Array<{ day: number; total: number; count: number }>;
  }> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const expenses = await this.expensesService.findByDateRange(
      userId,
      startDate,
      endDate,
    );

    const byDayOfWeek: Record<number, { total: number; count: number }> = {
      0: { total: 0, count: 0 }, // Domingo
      1: { total: 0, count: 0 },
      2: { total: 0, count: 0 },
      3: { total: 0, count: 0 },
      4: { total: 0, count: 0 },
      5: { total: 0, count: 0 },
      6: { total: 0, count: 0 }, // Sábado
    };

    const byDayOfMonth: Record<number, { total: number; count: number }> = {};
    for (let i = 1; i <= 31; i++) {
      byDayOfMonth[i] = { total: 0, count: 0 };
    }

    expenses.forEach((expense) => {
      const date = new Date(expense.date);
      const dayOfWeek = date.getUTCDay();
      const dayOfMonth = date.getUTCDate();
      const amount = Number(expense.amount);

      byDayOfWeek[dayOfWeek].total += amount;
      byDayOfWeek[dayOfWeek].count += 1;

      byDayOfMonth[dayOfMonth].total += amount;
      byDayOfMonth[dayOfMonth].count += 1;
    });

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return {
      byDayOfWeek: Object.entries(byDayOfWeek).map(([day, data]) => ({
        day: dayNames[Number(day)],
        total: data.total,
        count: data.count,
      })),
      byDayOfMonth: Object.entries(byDayOfMonth)
        .map(([day, data]) => ({
          day: Number(day),
          total: data.total,
          count: data.count,
        }))
        .filter((d) => d.count > 0),
    };
  }

  // Método para calcular score de saúde financeira
  async getFinancialHealthScore(userId: string): Promise<{
    score: number; // 0-100
    details: {
      expenseRatio: number; // % de gastos sobre receita
      positiveMonths: number; // meses positivos
      positiveMonthsPercentage: number;
      recurringExpenseRatio: number; // % de gastos recorrentes sobre renda
    };
    insights: string[];
  }> {
    const monthlyEvolution = await this.getMonthlyEvolution(userId, 12);
    const recurringExpenses = await this.getRecurringExpenses(userId);
    const incomeSources = await this.getIncomeSourcesAnalysis(userId);

    // Calcular métricas
    const totalIncome = monthlyEvolution.reduce(
      (sum, m) => sum + m.income,
      0,
    );
    const totalExpense = monthlyEvolution.reduce(
      (sum, m) => sum + m.expense,
      0,
    );
    const expenseRatio =
      totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;

    const positiveMonths = monthlyEvolution.filter((m) => m.balance > 0)
      .length;
    const positiveMonthsPercentage = (positiveMonths / monthlyEvolution.length) * 100;

    const totalRecurringAnnual = recurringExpenses.reduce(
      (sum, r) => sum + r.annualImpact,
      0,
    );
    const monthlyIncome = totalIncome / Math.max(monthlyEvolution.length, 1);
    const recurringExpenseRatio =
      monthlyIncome > 0 ? (totalRecurringAnnual / 12 / monthlyIncome) * 100 : 0;

    // Calcular score (0-100)
    let score = 100;

    // Penalizar se gastos > 90% da receita
    if (expenseRatio > 90) score -= 30;
    else if (expenseRatio > 80) score -= 20;
    else if (expenseRatio > 70) score -= 10;

    // Penalizar se poucos meses positivos
    if (positiveMonthsPercentage < 50) score -= 20;
    else if (positiveMonthsPercentage < 70) score -= 10;

    // Penalizar se muitos gastos recorrentes
    if (recurringExpenseRatio > 50) score -= 15;
    else if (recurringExpenseRatio > 40) score -= 10;

    score = Math.max(0, Math.min(100, score));

    // Gerar insights
    const insights: string[] = [];
    if (expenseRatio < 70) {
      insights.push('Boa taxa de poupança');
    } else if (expenseRatio > 90) {
      insights.push('Gastos muito altos em relação à receita');
    }

    if (positiveMonthsPercentage >= 80) {
      insights.push('Consistência financeira excelente');
    } else if (positiveMonthsPercentage < 50) {
      insights.push('Muitos meses no negativo');
    }

    if (recurringExpenseRatio > 40) {
      insights.push('Gastos recorrentes altos');
    }

    if (incomeSources.sourceCount === 1) {
      insights.push('Dependência de uma única fonte de renda');
    }

    return {
      score,
      details: {
        expenseRatio,
        positiveMonths,
        positiveMonthsPercentage,
        recurringExpenseRatio,
      },
      insights,
    };
  }

  // Método para comparação período atual vs anterior
  async getPeriodComparison(userId: string): Promise<{
    current: {
      income: number;
      expense: number;
      balance: number;
    };
    previous: {
      income: number;
      expense: number;
      balance: number;
    };
    changes: {
      incomeChange: number; // percentual
      expenseChange: number; // percentual
      balanceChange: number; // percentual
    };
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Período atual (este mês)
    const currentIncomes = await this.findByDateRange(userId, currentMonthStart, currentMonthEnd);
    const currentExpenses = await this.expensesService.findByDateRange(userId, currentMonthStart, currentMonthEnd);
    const currentIncome = currentIncomes.reduce((sum, income) => sum + Number(income.amount), 0);
    const currentExpense = currentExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const currentBalance = currentIncome - currentExpense;

    // Período anterior (mês passado)
    const previousIncomes = await this.findByDateRange(userId, lastMonthStart, lastMonthEnd);
    const previousExpenses = await this.expensesService.findByDateRange(userId, lastMonthStart, lastMonthEnd);
    const previousIncome = previousIncomes.reduce((sum, income) => sum + Number(income.amount), 0);
    const previousExpense = previousExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const previousBalance = previousIncome - previousExpense;

    // Calcular mudanças percentuais
    const incomeChange = previousIncome > 0 ? ((currentIncome - previousIncome) / previousIncome) * 100 : 0;
    const expenseChange = previousExpense > 0 ? ((currentExpense - previousExpense) / previousExpense) * 100 : 0;
    const balanceChange = previousBalance !== 0 ? ((currentBalance - previousBalance) / Math.abs(previousBalance)) * 100 : 0;

    return {
      current: {
        income: currentIncome,
        expense: currentExpense,
        balance: currentBalance,
      },
      previous: {
        income: previousIncome,
        expense: previousExpense,
        balance: previousBalance,
      },
      changes: {
        incomeChange,
        expenseChange,
        balanceChange,
      },
    };
  }

  // Método para orçamento sugerido (média dos últimos 3 meses)
  async getBudgetSuggestion(userId: string): Promise<{
    categories: Array<{
      category: string;
      suggestedBudget: number; // média dos últimos 3 meses
      currentSpent: number; // gasto do mês atual
      difference: number; // diferença (positivo = ultrapassou, negativo = dentro do orçamento)
      percentage: number; // % do orçamento usado
    }>;
    totalSuggested: number;
    totalSpent: number;
    totalDifference: number;
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Últimos 3 meses (excluindo o mês atual)
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const threeMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Gastos do mês atual
    const currentExpenses = await this.expensesService.findByDateRange(userId, currentMonthStart, currentMonthEnd);
    
    // Gastos dos últimos 3 meses (para calcular média)
    const historicalExpenses = await this.expensesService.findByDateRange(userId, threeMonthsAgoStart, threeMonthsAgoEnd);

    // Agrupar por categoria
    const categoryData: Record<string, { historical: number[]; current: number }> = {};

    // Processar gastos históricos (últimos 3 meses)
    historicalExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const category = expense.category;
      
      if (!categoryData[category]) {
        categoryData[category] = { historical: [], current: 0 };
      }
      
      // Agrupar por mês
      const existingMonth = categoryData[category].historical.find((_, index) => {
        const histDate = new Date(historicalExpenses[index]?.date || '');
        return `${histDate.getFullYear()}-${histDate.getMonth()}` === monthKey;
      });
      
      // Simplificar: somar todos os gastos históricos por categoria
      // Depois dividir por 3 para ter a média
      categoryData[category].historical.push(Number(expense.amount));
    });

    // Processar gastos atuais
    currentExpenses.forEach((expense) => {
      const category = expense.category;
      if (!categoryData[category]) {
        categoryData[category] = { historical: [], current: 0 };
      }
      categoryData[category].current += Number(expense.amount);
    });

    // Calcular média histórica por categoria
    const categories = Object.entries(categoryData).map(([category, data]) => {
      // Agrupar histórico por mês
      const monthlyTotals: Record<string, number> = {};
      historicalExpenses.forEach((expense) => {
        if (expense.category === category) {
          const date = new Date(expense.date);
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + Number(expense.amount);
        }
      });
      
      const monthlyValues = Object.values(monthlyTotals);
      const suggestedBudget = monthlyValues.length > 0
        ? monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length
        : 0;
      
      const currentSpent = data.current;
      const difference = currentSpent - suggestedBudget;
      const percentage = suggestedBudget > 0 ? (currentSpent / suggestedBudget) * 100 : 0;

      return {
        category,
        suggestedBudget,
        currentSpent,
        difference,
        percentage,
      };
    });

    const totalSuggested = categories.reduce((sum, cat) => sum + cat.suggestedBudget, 0);
    const totalSpent = categories.reduce((sum, cat) => sum + cat.currentSpent, 0);
    const totalDifference = totalSpent - totalSuggested;

    return {
      categories: categories.filter((cat) => cat.suggestedBudget > 0 || cat.currentSpent > 0),
      totalSuggested,
      totalSpent,
      totalDifference,
    };
  }

  // Método para Top 3 vilões do mês
  async getTopVillains(userId: string): Promise<{
    biggestCategoryIncrease: {
      category: string;
      current: number;
      previous: number;
      increase: number; // percentual
    } | null;
    heaviestRecurringExpense: {
      name: string;
      amount: number;
      annualImpact: number;
      category: string;
    } | null;
    biggestSingleExpense: {
      name: string | null;
      category: string;
      amount: number;
      date: string;
    } | null;
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Gastos do mês atual e anterior
    const currentExpenses = await this.expensesService.findByDateRange(userId, currentMonthStart, currentMonthEnd);
    const previousExpenses = await this.expensesService.findByDateRange(userId, lastMonthStart, lastMonthEnd);

    // 1. Categoria que mais cresceu
    const currentByCategory: Record<string, number> = {};
    const previousByCategory: Record<string, number> = {};

    currentExpenses.forEach((expense) => {
      currentByCategory[expense.category] = (currentByCategory[expense.category] || 0) + Number(expense.amount);
    });

    previousExpenses.forEach((expense) => {
      previousByCategory[expense.category] = (previousByCategory[expense.category] || 0) + Number(expense.amount);
    });

    let biggestCategoryIncrease: {
      category: string;
      current: number;
      previous: number;
      increase: number;
    } | null = null;

    Object.keys(currentByCategory).forEach((category) => {
      const current = currentByCategory[category];
      const previous = previousByCategory[category] || 0;
      if (previous > 0) {
        const increase = ((current - previous) / previous) * 100;
        if (!biggestCategoryIncrease || increase > biggestCategoryIncrease.increase) {
          biggestCategoryIncrease = {
            category,
            current,
            previous,
            increase,
          };
        }
      }
    });

    // 2. Gasto recorrente mais pesado
    const recurringExpenses = await this.getRecurringExpenses(userId);
    const heaviestRecurring = recurringExpenses.length > 0
      ? recurringExpenses.reduce((max, expense) =>
          expense.annualImpact > max.annualImpact ? expense : max,
        )
      : null;

    // 3. Maior despesa isolada do mês atual
    let biggestSingleExpense: {
      name: string | null;
      category: string;
      amount: number;
      date: string;
    } | null = null;

    currentExpenses.forEach((expense) => {
      const amount = Number(expense.amount);
      if (!biggestSingleExpense || amount > biggestSingleExpense.amount) {
        biggestSingleExpense = {
          name: expense.name,
          category: expense.category,
          amount,
          date: dateOnlyToString(expense.date),
        };
      }
    });

    return {
      biggestCategoryIncrease,
      heaviestRecurringExpense: heaviestRecurring,
      biggestSingleExpense,
    };
  }
}
