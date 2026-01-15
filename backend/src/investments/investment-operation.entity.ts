import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum OperationType {
  BUY = 'buy',
  SELL = 'sell',
  DIVIDEND = 'dividend',
  INTEREST = 'interest',
  STOCK_SPLIT = 'stock_split',
}

export enum AssetClass {
  STOCK = 'stock',
  BOND = 'bond',
  FUND = 'fund',
  ETF = 'etf',
  CRYPTO = 'crypto',
  REAL_ESTATE = 'real_estate',
  CASH = 'cash',
  OTHER = 'other',
}

@Entity('investment_operations')
export class InvestmentOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100 })
  asset: string; // Nome do ativo (ex: "PETR4", "ITUB4", "Bitcoin")

  @Column({ type: 'varchar', length: 100, nullable: true })
  assetClass: string; // Classe do ativo (ex: "stock", "bond", "fund")

  @Column({ type: 'enum', enum: OperationType })
  type: OperationType;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'bigint' })
  quantity: number; // Quantidade (em centavos para permitir frações)

  @Column({ type: 'bigint' })
  price: number; // Preço unitário em centavos

  @Column({ type: 'bigint' })
  totalAmount: number; // Valor total da operação em centavos

  @Column({ type: 'varchar', length: 10, default: 'BRL' })
  currency: string; // Moeda (BRL, USD, EUR, etc)

  @Column({ type: 'varchar', length: 100, nullable: true })
  broker: string | null; // Corretora (ex: "Rico", "XP", "Clear")

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Observações

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
