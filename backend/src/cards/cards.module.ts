import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';
import { Card } from './card.entity';
import { AuthModule } from '../auth/auth.module';
import { Expense } from '../expenses/expense.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Card, Expense]), AuthModule],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
