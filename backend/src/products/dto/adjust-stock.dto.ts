import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { StockMovementType } from '@prisma/client';

export class AdjustStockDto {
  @IsInt({ message: 'A quantidade deve ser um número inteiro' })
  @Min(0, { message: 'A quantidade não pode ser negativa' })
  quantity: number;

  @IsEnum(StockMovementType, { message: 'Tipo deve ser ENTRADA, SAIDA ou AJUSTE' })
  type: StockMovementType;

  @IsString()
  @IsNotEmpty({ message: 'Motivo do ajuste é obrigatório' })
  reason: string;
}
