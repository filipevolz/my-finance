import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('asset_types')
export class AssetType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 50 })
  assetGroup: string; // STOCK, STOCK_USA, BDR, etc.

  @Column({ type: 'varchar', length: 100 })
  groupName: string; // Ações, Ações EUA, BDR, etc.

  @Column({ type: 'varchar', length: 50 })
  category: string; // StockExchange, Treasury, etc.

  @Column({ type: 'varchar', length: 100 })
  categoryName: string; // Bolsa de Valores (BR e EUA), etc.

  @Column({ type: 'varchar', length: 50 })
  assetGroupIRRF: string;

  @Column({ type: 'boolean', default: false })
  exemption: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  feePercent: number;

  @Column({ type: 'integer', default: 0 })
  exemptionValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
