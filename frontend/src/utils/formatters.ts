import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata um valor em centavos para moeda brasileira (R$)
 * @param value Valor em centavos
 * @returns String formatada como "R$ 1.234,56"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
}

/**
 * Formata uma data no formato YYYY-MM-DD para DD/MM/YYYY
 * @param dateString Data no formato YYYY-MM-DD
 * @returns String formatada como "15/01/2026"
 */
export function formatDate(dateString: string): string {
  return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formata uma data no formato YYYY-MM para MMM/yyyy
 * @param monthString Data no formato YYYY-MM
 * @returns String formatada como "Jan/2026"
 */
export function formatMonthYear(monthString: string): string {
  return format(parseISO(`${monthString}-01`), 'MMM/yyyy', {
    locale: ptBR,
  });
}

/**
 * Formata um percentual com sinal
 * @param value Valor do percentual
 * @param decimals Número de casas decimais (padrão: 1)
 * @returns String formatada como "+12.5%" ou "-8.3%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
