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

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 255 })
  nickname: string; // Apelido ou nome do banco

  @Column({ type: 'varchar', length: 4, nullable: true })
  lastFourDigits: string | null; // Últimos 4 dígitos (opcional)

  @Column({ type: 'int' })
  dueDate: number; // Dia de vencimento (1-31)

  @Column({ type: 'bigint', nullable: true, name: 'total_limit' })
  totalLimit: number | null; // Limite total do cartão em centavos

  @Column({ type: 'bigint', default: 0, name: 'used_limit' })
  usedLimit: number; // Limite utilizado em centavos

  @Column({ type: 'bigint', nullable: true, name: 'available_limit' })
  availableLimit: number | null; // Limite disponível em centavos (mantido para compatibilidade)

  // Getter para calcular limite disponível
  get calculatedAvailableLimit(): number {
    if (this.totalLimit === null || this.totalLimit === undefined) {
      // Se totalLimit não existe, usar availableLimit antigo se disponível
      return this.availableLimit ?? 0;
    }
    return (this.totalLimit ?? 0) - (this.usedLimit ?? 0);
  }

  @Column({ type: 'int' })
  closingDate: number; // Dia de fechamento da fatura (1-31)

  @Column({ type: 'boolean', default: false })
  isDefault: boolean; // Cartão padrão

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
