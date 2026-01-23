import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';

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
}
