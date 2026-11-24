import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nome não pode ser vazio' })
  name?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Perfil deve ser ADMIN ou OPERADOR' })
  role?: Role;
}
