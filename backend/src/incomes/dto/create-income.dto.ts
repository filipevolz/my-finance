import {
  IsString,
  IsInt,
  IsDateString,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateIncomeDto {
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
  isRecurring?: boolean;
}
