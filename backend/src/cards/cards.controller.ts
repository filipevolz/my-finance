import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() userId: string,
    @Body(ValidationPipe) createCardDto: CreateCardDto,
  ) {
    const card = await this.cardsService.create(userId, createCardDto);
    return {
      message: 'Cartão criado com sucesso',
      data: card,
    };
  }

  @Get()
  async findAll(@CurrentUser() userId: string) {
    const cards = await this.cardsService.findAll(userId);
    return { data: cards };
  }

  @Get('default')
  async findDefault(@CurrentUser() userId: string) {
    const card = await this.cardsService.findDefault(userId);
    return { data: card };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() userId: string) {
    const card = await this.cardsService.findOne(id, userId);
    return { data: card };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() userId: string,
    @Body(ValidationPipe) updateCardDto: UpdateCardDto,
  ) {
    const card = await this.cardsService.update(id, userId, updateCardDto);
    return {
      message: 'Cartão atualizado com sucesso',
      data: card,
    };
  }

  @Patch(':id/set-default')
  async setAsDefault(@Param('id') id: string, @CurrentUser() userId: string) {
    const card = await this.cardsService.setAsDefault(id, userId);
    return {
      message: 'Cartão definido como padrão com sucesso',
      data: card,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() userId: string) {
    await this.cardsService.remove(id, userId);
  }

  @Post('recalculate-limits')
  @HttpCode(HttpStatus.OK)
  async recalculateAllLimits(@CurrentUser() userId: string) {
    const cards = await this.cardsService.recalculateAllUsedLimits(userId);
    return {
      message: 'Limites recalculados com sucesso',
      data: cards,
    };
  }
}
