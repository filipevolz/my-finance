import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exchanges')
export class Exchange {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  exchangeName: string;

  @Column({ type: 'text' })
  category: string; // StockExchange;Account;CurrencyExchange; etc. (separado por ;)

  @Column({ type: 'varchar', length: 10, default: 'BRL' })
  currency: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  participantName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nameEnum: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cnpj: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
