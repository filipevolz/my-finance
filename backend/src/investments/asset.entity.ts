import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('assets')
@Index(['ticker'])
@Index(['assetGroup'])
export class Asset {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  assetName: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  ticker: string; // Ex: "PETR4", "ITUB4"

  @Column({ type: 'varchar', length: 50, nullable: true })
  alias: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  tickerRef: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  pic: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sector: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subSector: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  typeTax: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  index: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  segment: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  assetType: string | null; // ON, PN, UNT, etc.

  @Column({ type: 'varchar', length: 20, nullable: true })
  cnpj: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cnpjAdmin: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  administrator: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  legalName: string | null;

  @Column({ type: 'int', nullable: true })
  codeAPI: number | null;

  @Column({ type: 'text', nullable: true })
  exceptions: string | null;

  @Column({ type: 'int', default: 0 })
  market: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  marketString: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ type: 'boolean', default: false })
  exemption: boolean;

  @Column({ type: 'varchar', length: 50 })
  assetGroup: string; // STOCK, ETF, FII, etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  assetSeries: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
