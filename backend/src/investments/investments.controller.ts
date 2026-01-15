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

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

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
}
