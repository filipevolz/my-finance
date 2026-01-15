import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { OperationType } from '../investment-operation.entity';

export class CreateInvestmentOperationDto {
  @IsNotEmpty({ message: 'Ativo é obrigatório' })
  @IsString({ message: 'Ativo deve ser uma string' })
  asset: string;

  @IsOptional()
  @IsString({ message: 'Classe do ativo deve ser uma string' })
  assetClass?: string;

  @IsNotEmpty({ message: 'Tipo de operação é obrigatório' })
  @IsEnum(OperationType, { message: 'Tipo de operação inválido' })
  type: OperationType;

  @IsNotEmpty({ message: 'Data é obrigatória' })
  @IsDateString({}, { message: 'Data inválida' })
  date: string;

  @IsNotEmpty({ message: 'Quantidade é obrigatória' })
  @IsNumber({}, { message: 'Quantidade deve ser um número' })
  @Min(0, { message: 'Quantidade deve ser maior ou igual a zero' })
  quantity: number;

  @IsNotEmpty({ message: 'Preço é obrigatório' })
  @IsNumber({}, { message: 'Preço deve ser um número' })
  @Min(0, { message: 'Preço deve ser maior ou igual a zero' })
  price: number;

  @IsOptional()
  @IsString({ message: 'Moeda deve ser uma string' })
  currency?: string;

  @IsOptional()
  @IsString({ message: 'Corretora deve ser uma string' })
  broker?: string;

  @IsOptional()
  @IsString({ message: 'Observações deve ser uma string' })
  notes?: string;
}
