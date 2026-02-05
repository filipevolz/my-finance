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
import { Card } from '../cards/card.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'bigint' })
  amount: number; // Valor em centavos (inteiro)

  @Column({ type: 'date' })
  date: Date; // Data de vencimento/pagamento (para filtros e cálculos)

  @Column({ type: 'date', nullable: true, name: 'purchase_date' })
  purchaseDate: Date | null; // Data original da compra (para exibição, quando diferente da data de vencimento)

  @Column({ type: 'boolean', default: false })
  is_paid: boolean;

  @ManyToOne(() => Card, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'card_id' })
  card: Card | null;

  @Column({ name: 'card_id', nullable: true })
  cardId: string | null;

  @Column({ type: 'int', nullable: true })
  installments: number | null; // Número de parcelas

  @Column({ type: 'int', nullable: true })
  installmentNumber: number | null; // Número da parcela atual (1, 2, 3, etc.)

  @Column({ type: 'uuid', nullable: true, name: 'group_id' })
  groupId: string | null; // ID do grupo de despesas parceladas (mesmo UUID para todas as parcelas)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
