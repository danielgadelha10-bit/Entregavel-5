// Utilitários para formatação monetária e datas

/**
 * Converte valor em centavos para formato em Real (ex: 2550 -> "R$ 25,50")
 */
export function formatCurrency(cents: number): string {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

/**
 * Converte string digitada pelo usuário (ex: "25,50" ou "25.50") para centavos (2550)
 */
export function parseCurrencyToCents(val: string | number): number {
  if (typeof val === 'number') {
    return Math.round(val);
  }
  if (!val) return 0;
  // Remove R$, espaços e converte vírgula para ponto
  const clean = val.replace(/[^\d,-]/g, '').replace(',', '.');
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

/**
 * Converte centavos para formato editável em input (ex: 2550 -> "25,50")
 */
export function centsToDecimalString(cents: number): string {
  if (!cents && cents !== 0) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Formata data em formato brasileiro dd/mm/aaaa
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata data e hora dd/mm/aaaa às hh:mm
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
