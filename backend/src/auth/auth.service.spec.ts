import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';

describe('AuthService (Regras de Negócio e Segurança)', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((callback) => callback(prisma)),
      user: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve atribuir perfil ADMIN automaticamente para o PRIMEIRO usuário cadastrado', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.count.mockResolvedValue(0); // 0 usuários no banco
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'user-1', ...data }));

    const result = await service.register({
      name: 'Primeiro Admin',
      email: 'admin@sistema.com',
      password: 'password123',
    });

    expect(result.user.role).toBe(Role.ADMIN);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: Role.ADMIN,
        }),
      }),
    );
  });

  it('deve atribuir perfil OPERADOR para os demais usuários cadastrados', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.count.mockResolvedValue(1); // Já existe 1 usuário (o Admin)
    prisma.user.create.mockImplementation(({ data }) => Promise.resolve({ id: 'user-2', ...data }));

    const result = await service.register({
      name: 'Operador Vendas',
      email: 'operador@sistema.com',
      password: 'password123',
    });

    expect(result.user.role).toBe(Role.OPERADOR);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: Role.OPERADOR,
        }),
      }),
    );
  });

  it('deve rejeitar cadastro com e-mail já existente', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'admin@sistema.com' });

    await expect(
      service.register({
        name: 'Duplicado',
        email: 'ADMIN@sistema.com ',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('deve criptografar a senha com Argon2 no cadastro e autenticar no login', async () => {
    const rawPassword = 'superSecretPassword123';
    const hashedPassword = await argon2.hash(rawPassword);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@sistema.com',
      password: hashedPassword,
      role: Role.ADMIN,
      createdAt: new Date(),
    });

    const loginResult = await service.login({
      email: 'admin@sistema.com',
      password: rawPassword,
    });

    expect(loginResult.accessToken).toBe('mock-jwt-token');
    expect(loginResult.user.email).toBe('admin@sistema.com');
  });

  it('deve rejeitar login com senha incorreta', async () => {
    const hashedPassword = await argon2.hash('senhaCorreta123');

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Admin',
      email: 'admin@sistema.com',
      password: hashedPassword,
      role: Role.ADMIN,
    });

    await expect(
      service.login({
        email: 'admin@sistema.com',
        password: 'senhaIncorretaErrada',
      }),
    ).rejects.toThrow('E-mail ou senha incorretos');
  });
});
