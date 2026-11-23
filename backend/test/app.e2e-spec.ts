import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App & Auth Flow (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;

  beforeAll(async () => {
    prismaMock = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      user: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'e2e-user-id',
            name: data.name,
            email: data.email,
            role: data.role,
            createdAt: new Date(),
          }),
        ),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register - deve cadastrar o primeiro usuário com perfil ADMIN', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Super Admin E2E',
        email: 'admin.e2e@teste.com',
        password: 'password123',
      })
      .expect(201);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.user.role).toBe('ADMIN');
    expect(response.body.user.email).toBe('admin.e2e@teste.com');
  });

  it('POST /api/auth/register - deve falhar validação com dados inválidos', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: '',
        email: 'email-invalido',
        password: '123', // menos de 6 caracteres
      })
      .expect(400);
  });
});
