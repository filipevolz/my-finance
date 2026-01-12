import { IsOptional, IsEnum } from 'class-validator';

export enum Period {
  THIS_MONTH = 'this-month',
  LAST_MONTH = 'last-month',
  THIS_YEAR = 'this-year',
  LAST_12_MONTHS = 'last-12-months',
}

export class StatsQueryDto {
  @IsOptional()
  @IsEnum(Period)
  period?: Period;
}
