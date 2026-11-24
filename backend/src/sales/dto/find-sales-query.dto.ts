import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentStatus, PaymentType } from '@prisma/client';

export class FindSalesQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsEnum(PaymentStatus, { message: 'Status de pagamento deve ser PAGO ou PENDENTE' })
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentType, { message: 'Tipo de pagamento deve ser A_VISTA ou A_PRAZO' })
  paymentType?: PaymentType;
}
