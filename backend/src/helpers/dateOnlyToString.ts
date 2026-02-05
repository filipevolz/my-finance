 export function dateOnlyToString(date: string | Date): string {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    // já é YYYY-MM-DD
    return date;
  }