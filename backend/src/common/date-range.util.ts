import { BadRequestException } from '@nestjs/common';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte parâmetros opcionais de data inicial e final em filtro Prisma `createdAt`.
 * Suporta datas no formato "YYYY-MM-DD" (limites UTC do dia inteiro) ou timestamps ISO-8601.
 */
export function buildCreatedAtFilter(
  startDate?: string,
  endDate?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }

  const filter: { gte?: Date; lte?: Date } = {};

  if (startDate) {
    const start = DATE_ONLY_REGEX.test(startDate)
      ? new Date(`${startDate}T00:00:00.000Z`)
      : new Date(startDate);

    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Data inicial inválida');
    }
    filter.gte = start;
  }

  if (endDate) {
    const end = DATE_ONLY_REGEX.test(endDate)
      ? new Date(`${endDate}T23:59:59.999Z`)
      : new Date(endDate);

    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Data final inválida');
    }
    filter.lte = end;
  }

  if (filter.gte && filter.lte && filter.gte > filter.lte) {
    throw new BadRequestException('A data inicial não pode ser maior que a data final');
  }

  return filter;
}

/**
 * Formata uma data no padrão YYYY-MM-DD usando o fuso horário local do processo.
 */
export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
