import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const hashedPassword = await argon2.hash(dto.password);

    const createUserInTx = async () => {
      return this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.user.findUnique({
            where: { email: normalizedEmail },
          });

          if (existing) {
            throw new ConflictException('Já existe um usuário cadastrado com este e-mail');
          }

          // Regra de negócio: Primeiro usuário recebe automaticamente ADMIN, os demais OPERADOR
          const usersCount = await tx.user.count();
          const role: Role = usersCount === 0 ? Role.ADMIN : Role.OPERADOR;

          return tx.user.create({
            data: {
              name: dto.name.trim(),
              email: normalizedEmail,
              password: hashedPassword,
              role,
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    };

    let user;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        user = await createUserInTx();
        break;
      } catch (err: any) {
        if (err?.code === 'P2002') {
          throw new ConflictException('Já existe um usuário cadastrado com este e-mail');
        }
        // Retry apenas em conflito de serialização (P2034) ao registrar usuários simultaneamente
        if (err?.code === 'P2034' && attempt < maxAttempts) {
          continue;
        }
        throw err;
      }
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Usuário cadastrado com sucesso',
      user,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken: token,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
