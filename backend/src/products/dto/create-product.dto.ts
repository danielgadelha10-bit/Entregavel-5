import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome do produto é obrigatório' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Unidade de medida é obrigatória (ex: UN, KG, CX, LT)' })
  unit: string;

  @IsInt({ message: 'Preço deve ser um número inteiro em centavos' })
  @Min(0, { message: 'Preço não pode ser negativo' })
  price: number;

  @IsInt({ message: 'Estoque inicial deve ser um número inteiro' })
  @Min(0, { message: 'Estoque não pode ser negativo' })
  stock: number;
}
