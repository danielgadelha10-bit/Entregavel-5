import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@prisma/client';

export class SaleItemDto {
  @IsString()
  @IsNotEmpty({ message: 'ID do produto é obrigatório' })
  productId: string;

  @IsInt({ message: 'A quantidade deve ser um número inteiro' })
  @Min(1, { message: 'A quantidade mínima é 1' })
  quantity: number;
}

export class CreateSaleDto {
  @IsString()
  @IsNotEmpty({ message: 'Cliente é obrigatório' })
  clientId: string;

  @IsEnum(PaymentType, { message: 'Tipo de pagamento deve ser A_VISTA ou A_PRAZO' })
  paymentType: PaymentType;

  @IsArray({ message: 'A venda deve conter uma lista de itens' })
  @ArrayMinSize(1, { message: 'A venda deve possuir pelo menos um produto' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}
