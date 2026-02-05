import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { IncomesModule } from './incomes/incomes.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CategoriesModule } from './categories/categories.module';
import { InvestmentsModule } from './investments/investments.module';
import { CardsModule } from './cards/cards.module';
import { User } from './users/user.entity';
import { Income } from './incomes/income.entity';
import { Expense } from './expenses/expense.entity';
import { Category } from './categories/category.entity';
import { InvestmentOperation } from './investments/investment-operation.entity';
import { AssetType } from './investments/asset-type.entity';
import { Exchange } from './investments/exchange.entity';
import { Asset } from './investments/asset.entity';
import { Card } from './cards/card.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
          throw new Error('DATABASE_URL não está definida');
        }

        const url = new URL(databaseUrl);

        return {
          type: 'postgres',
          host: url.hostname,
          port: parseInt(url.port) || 5432,
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          ssl: {
            rejectUnauthorized: false,
          },
          entities: [User, Income, Expense, Category, InvestmentOperation, AssetType, Exchange, Asset, Card],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    IncomesModule,
    ExpensesModule,
    CategoriesModule,
    InvestmentsModule,
    CardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
