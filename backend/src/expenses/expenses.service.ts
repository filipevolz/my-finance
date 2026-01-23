import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CategoriesService } from '../categories/categories.service';
import { CategoryType } from '../categories/category.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private expensesRepository: Repository<Expense>,
    private categoriesService: CategoriesService,
  ) {}

  async create(
    userId: string,
    createExpenseDto: CreateExpenseDto,
  ): Promise<Expense> {
    // Converter string YYYY-MM-DD para Date object sem problemas de timezone
    const dateStr = createExpenseDto.date.split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    const expense = this.expensesRepository.create({
      userId,
      name: createExpenseDto.name || null,
      category: createExpenseDto.category,
      amount: createExpenseDto.amount,
      date,
      is_paid: createExpenseDto.is_paid ?? false,
    });

    return await this.expensesRepository.save(expense);
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
  ): Promise<Expense> {
    const expense = await this.findOne(id, userId);

    Object.assign(expense, updateExpenseDto);

    if (updateExpenseDto.date) {
      // Converter string YYYY-MM-DD para Date object sem problemas de timezone
      const dateStr = updateExpenseDto.date.split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      expense.date = new Date(year, month - 1, day);
    }

    return await this.expensesRepository.save(expense);
  }

  async remove(id: string, userId: string): Promise<void> {
    const expense = await this.findOne(id, userId);
    await this.expensesRepository.remove(expense);
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
