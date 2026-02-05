import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateCardDto {
  @IsString()
  nickname: string; // Apelido ou nome do banco

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Últimos 4 dígitos devem conter exatamente 4 números',
  })
  lastFourDigits?: string | null; // Últimos 4 dígitos (opcional)

  @IsInt()
  @Min(1)
  @Max(31)
  dueDate: number; // Dia de vencimento (1-31)

  @IsInt()
  @Min(1) // Mínimo de 1 centavo
  totalLimit: number; // Limite total do cartão em centavos

  @IsInt()
  @Min(1)
  @Max(31)
  closingDate: number; // Dia de fechamento da fatura (1-31)

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean; // Cartão padrão
}
