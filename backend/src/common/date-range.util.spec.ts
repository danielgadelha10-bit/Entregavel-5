import { BadRequestException } from '@nestjs/common';
import { buildCreatedAtFilter, formatLocalDateKey } from './date-range.util';

describe('date-range.util', () => {
  it('deve retornar undefined quando nenhuma data é informada', () => {
    expect(buildCreatedAtFilter()).toBeUndefined();
  });

  it('deve construir limites UTC completos para datas YYYY-MM-DD', () => {
    const filter = buildCreatedAtFilter('2026-11-24', '2026-11-24');
    expect(filter?.gte?.toISOString()).toBe('2026-11-24T00:00:00.000Z');
    expect(filter?.lte?.toISOString()).toBe('2026-11-24T23:59:59.999Z');
  });

  it('deve rejeitar datas inválidas ou intervalo invertido', () => {
    expect(() => buildCreatedAtFilter('data-invalida')).toThrow(BadRequestException);
    expect(() => buildCreatedAtFilter('2026-11-25', '2026-11-24')).toThrow(BadRequestException);
  });

  it('deve formatar chave local YYYY-MM-DD corretamente', () => {
    const d = new Date(2026, 10, 5, 23, 30, 0); // Nov 5 local
    expect(formatLocalDateKey(d)).toBe('2026-11-05');
  });
});
