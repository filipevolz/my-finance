import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1) // Mínimo de 1 centavo
  amount?: number; // Valor em centavos (inteiro)

  @IsOptional()
  @IsDateString()
  date?: string;
}
