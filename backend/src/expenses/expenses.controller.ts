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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() userId: string,
    @Body(ValidationPipe) createExpenseDto: CreateExpenseDto,
  ) {
    const expense = await this.expensesService.create(userId, createExpenseDto);
    return {
      message: 'Despesa criada com sucesso',
      data: expense,
    };
  }

  @Get()
  async findAll(
    @CurrentUser() userId: string,
    @Query('period')
    period?: 'this-month' | 'last-month' | 'this-year' | 'last-12-months',
  ) {
    if (period) {
      const expenses = await this.expensesService.findByPeriod(userId, period);
      return { data: expenses };
    }
    const expenses = await this.expensesService.findAll(userId);
    return { data: expenses };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    const expense = await this.expensesService.findOne(id, userId);
    return { data: expense };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body(ValidationPipe) updateExpenseDto: UpdateExpenseDto,
  ) {
    const expense = await this.expensesService.update(
      id,
      userId,
      updateExpenseDto,
    );
    return {
      message: 'Despesa atualizada com sucesso',
      data: expense,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() userId: string) {
    await this.expensesService.remove(id, userId);
  }

  @Get('category/:category')
  async findByCategory(
    @Param('category') category: string,
    @CurrentUser() userId: string,
  ) {
    const expenses = await this.expensesService.findByCategory(
      userId,
      category,
    );
    return { data: expenses };
  }

  @Get('by-category/stats')
  async getByCategory(
    @CurrentUser() userId: string,
    @Query('period')
    period?: 'this-month' | 'last-month' | 'this-year' | 'last-12-months',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.expensesService.getByCategory(
      userId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return { data: stats };
  }
}
