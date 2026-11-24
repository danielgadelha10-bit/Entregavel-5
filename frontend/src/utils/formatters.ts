// Utilitários para formatação monetária, datas e erros de API

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
 * Converte string digitada pelo usuário (ex: "25,50", "25.50" ou "1.250,50") para centavos (2550)
 */
export function parseCurrencyToCents(val: string | number): number {
  if (typeof val === 'number') {
    return Math.round(val);
  }
  if (!val) return 0;

  // Mantém apenas dígitos, separadores decimais/milhar e sinal negativo
  let clean = val.replace(/[^\d.,-]/g, '');
  if (!clean) return 0;

  if (clean.includes(',')) {
    // Formato pt-BR: ponto é separador de milhar, vírgula é decimal
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    // Se houver múltiplos pontos sem vírgula, mantém apenas o último como decimal
    const parts = clean.split('.');
    if (parts.length > 2) {
      const decimal = parts.pop();
      clean = `${parts.join('')}.${decimal}`;
    }
  }

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

/**
 * Retorna uma data no formato YYYY-MM-DD usando o fuso horário local do navegador.
 */
export function getLocalDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte YYYY-MM-DD local para timestamp ISO do início do dia (00:00:00.000 local).
 */
export function toStartOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000`).toISOString();
}

/**
 * Converte YYYY-MM-DD local para timestamp ISO do fim do dia (23:59:59.999 local).
 */
export function toEndOfDayIso(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999`).toISOString();
}

/**
 * Extrai mensagem legível de erros do Axios / NestJS ValidationPipe.
 */
export function extractApiErrorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) {
    return message.join(', ');
  }
  if (typeof message === 'string' && message.trim()) {
    return message;
  }
  return fallback;
}
