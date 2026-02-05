import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsUUID,
  ValidateIf,
  Allow,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateExpenseDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsInt()
  @Min(1) // Mínimo de 1 centavo
  amount: number; // Valor em centavos (inteiro)

  @IsDateString()
  date: string;

  @IsOptional()
  @IsBoolean()
  is_paid?: boolean;

  @IsOptional()
  @Allow()
  @Transform(({ value }) => (value === '' || value === 'none' ? null : value))
  @ValidateIf((o) => o.cardId !== null && o.cardId !== undefined)
  @IsUUID(undefined, { message: 'cardId deve ser um UUID válido' })
  cardId?: string | null;

  @IsOptional()
  @Allow()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((o) => o.installments !== null && o.installments !== undefined)
  @IsInt({ message: 'installments deve ser um número inteiro' })
  @Min(1, { message: 'installments deve ser no mínimo 1' })
  @Max(24, { message: 'installments deve ser no máximo 24' })
  installments?: number | null;
}
