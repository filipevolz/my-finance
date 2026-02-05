import {
  IsString,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  Matches,
} from 'class-validator';

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}$/, {
    message: 'Últimos 4 dígitos devem conter exatamente 4 números',
  })
  lastFourDigits?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDate?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  usedLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  closingDate?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
