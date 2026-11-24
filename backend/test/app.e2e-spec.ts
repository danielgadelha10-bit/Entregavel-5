import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentStatus, PaymentType, Role, StockMovementType } from '@prisma/client';

describe('Sistema de Gestão Comercial (e2e)', () => {
  let app: INestApplication;

  // Banco em memória simulado para testes E2E isolados de rede/instância externa
  const db = {
    users: [] as any[],
    products: [] as any[],
    clients: [] as any[],
    sales: [] as any[],
    stockMovements: [] as any[],
  };

  let idCounter = 1;
  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  const txMock: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    user: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(
          db.users.find((u) => (where.id ? u.id === where.id : u.email === where.email)) || null,
        ),
      ),
      findMany: jest.fn(() =>
        Promise.resolve(
          db.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            _count: { sales: db.sales.filter((s) => s.sellerId === u.id).length },
          })),
        ),
      ),
      count: jest.fn(({ where } = {}) =>
        Promise.resolve(
          where?.role ? db.users.filter((u) => u.role === where.role).length : db.users.length,
        ),
      ),
      create: jest.fn(({ data }) => {
        const created = { id: nextId('user'), ...data, createdAt: new Date(), updatedAt: new Date() };
        db.users.push(created);
        return Promise.resolve({
          id: created.id,
          name: created.name,
          email: created.email,
          role: created.role,
          createdAt: created.createdAt,
        });
      }),
      update: jest.fn(({ where, data }) => {
        const u = db.users.find((item) => item.id === where.id);
        Object.assign(u, data);
        return Promise.resolve({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        });
      }),
    },
    product: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(db.products.find((p) => p.id === where.id) || null),
      ),
      findMany: jest.fn(({ where } = {}) =>
        Promise.resolve(
          db.products.filter((p) => {
            if (where?.active !== undefined && p.active !== where.active) return false;
            if (where?.stock?.lte !== undefined && p.stock > where.stock.lte) return false;
            return true;
          }),
        ),
      ),
      count: jest.fn(({ where } = {}) =>
        Promise.resolve(
          db.products.filter((p) => {
            if (where?.active !== undefined && p.active !== where.active) return false;
            if (where?.stock?.lte !== undefined && p.stock > where.stock.lte) return false;
            return true;
          }).length,
        ),
      ),
      create: jest.fn(({ data }) => {
        const created = {
          id: nextId('prod'),
          active: true,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        db.products.push(created);
        return Promise.resolve(created);
      }),
      update: jest.fn(({ where, data }) => {
        const p = db.products.find((item) => item.id === where.id);
        if (data.stock?.decrement !== undefined) {
          p.stock -= data.stock.decrement;
        } else if (data.stock?.increment !== undefined) {
          p.stock += data.stock.increment;
        } else if (data.stock !== undefined) {
          p.stock = data.stock;
        }
        if (data.price !== undefined) p.price = data.price;
        if (data.name !== undefined) p.name = data.name;
        if (data.unit !== undefined) p.unit = data.unit;
        if (data.active !== undefined) p.active = data.active;
        return Promise.resolve(p);
      }),
    },
    client: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(db.clients.find((c) => c.id === where.id) || null),
      ),
      findMany: jest.fn(() =>
        Promise.resolve(
          db.clients.map((c) => ({
            ...c,
            _count: { sales: db.sales.filter((s) => s.clientId === c.id).length },
          })),
        ),
      ),
      count: jest.fn(() => Promise.resolve(db.clients.length)),
      create: jest.fn(({ data }) => {
        const created = { id: nextId('client'), ...data, createdAt: new Date(), updatedAt: new Date() };
        db.clients.push(created);
        return Promise.resolve(created);
      }),
      update: jest.fn(({ where, data }) => {
        const c = db.clients.find((item) => item.id === where.id);
        Object.assign(c, data);
        return Promise.resolve(c);
      }),
    },
    sale: {
      findUnique: jest.fn(({ where }) => {
        const s = db.sales.find((item) => item.id === where.id);
        if (!s) return Promise.resolve(null);
        return Promise.resolve({
          ...s,
          client: db.clients.find((c) => c.id === s.clientId),
          seller: db.users.find((u) => u.id === s.sellerId),
        });
      }),
      findMany: jest.fn(({ where } = {}) => {
        const filtered = db.sales
          .filter((s) => {
            if (where?.sellerId && s.sellerId !== where.sellerId) return false;
            if (where?.paymentStatus && s.paymentStatus !== where.paymentStatus) return false;
            if (where?.paymentType && s.paymentType !== where.paymentType) return false;
            if (where?.clientId && s.clientId !== where.clientId) return false;
            if (where?.createdAt?.gte && s.createdAt < where.createdAt.gte) return false;
            if (where?.createdAt?.lte && s.createdAt > where.createdAt.lte) return false;
            return true;
          })
          .map((s) => ({
            ...s,
            client: db.clients.find((c) => c.id === s.clientId),
            seller: db.users.find((u) => u.id === s.sellerId),
          }));
        return Promise.resolve(filtered);
      }),
      create: jest.fn(({ data }) => {
        const saleId = nextId('sale');
        const items = (data.items?.create || []).map((it: any) => ({
          id: nextId('item'),
          saleId,
          ...it,
          product: db.products.find((p) => p.id === it.productId),
        }));
        const created = {
          id: saleId,
          sellerId: data.sellerId,
          clientId: data.clientId,
          paymentType: data.paymentType,
          paymentStatus: data.paymentStatus,
          total: data.total,
          paidAt: data.paidAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          items,
          client: db.clients.find((c) => c.id === data.clientId),
          seller: db.users.find((u) => u.id === data.sellerId),
        };
        db.sales.push(created);
        return Promise.resolve(created);
      }),
      update: jest.fn(({ where, data }) => {
        const s = db.sales.find((item) => item.id === where.id);
        Object.assign(s, data);
        return Promise.resolve(s);
      }),
    },
    stockMovement: {
      create: jest.fn(({ data }) => {
        const created = { id: nextId('mov'), ...data, createdAt: new Date() };
        db.stockMovements.push(created);
        return Promise.resolve(created);
      }),
      findMany: jest.fn(() => Promise.resolve(db.stockMovements)),
    },
  };

  const prismaMock = {
    ...txMock,
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(async (cb: any) => {
      // Snapshot simples para simular rollback transacional de produtos e vendas
      const productBackup = db.products.map((p) => ({ ...p }));
      const salesBackup = db.sales.map((s) => ({ ...s }));
      try {
        return await cb(txMock);
      } catch (err) {
        db.products = productBackup;
        db.sales = salesBackup;
        throw err;
      }
    }),
  };

  let adminToken = '';
  let operatorToken = '';
  let productId = '';
  let clientId = '';
  let pendingSaleId = '';

  beforeAll(async () => {
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
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health - deve responder status ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('up');
  });

  it('POST /api/auth/register - primeiro usuário vira ADMIN e segundo vira OPERADOR', async () => {
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Admin E2E',
        email: 'admin.e2e@teste.com',
        password: 'password123',
      })
      .expect(201);

    expect(adminRes.body.user.role).toBe(Role.ADMIN);
    adminToken = adminRes.body.accessToken;

    const opRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Operador E2E',
        email: 'operador.e2e@teste.com',
        password: 'password123',
      })
      .expect(201);

    expect(opRes.body.user.role).toBe(Role.OPERADOR);
    operatorToken = opRes.body.accessToken;
  });

  it('POST /api/auth/register - deve falhar validação com dados inválidos', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: '',
        email: 'email-invalido',
        password: '123',
      })
      .expect(400);
  });

  it('RBAC - deve bloquear OPERADOR em rotas exclusivas de ADMIN', async () => {
    await request(app.getHttpServer()).get('/api/users').expect(401);

    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/reports/by-client')
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({ name: 'Bloqueado', unit: 'UN', price: 1000, stock: 5 })
      .expect(403);
  });

  it('Produtos e Estoque - ADMIN cria produto e ajusta estoque via DTO validado', async () => {
    const prodRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cimento 50KG', unit: 'SC', price: 3850, stock: 10 })
      .expect(201);

    productId = prodRes.body.id;
    expect(prodRes.body.stock).toBe(10);

    const adjRes = await request(app.getHttpServer())
      .post(`/api/products/${productId}/adjust-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        quantity: 5,
        type: StockMovementType.ENTRADA,
        reason: 'Reposição E2E',
      })
      .expect(201);

    expect(adjRes.body.stock).toBe(15);
  });

  it('Clientes, Vendas, Rollback, Preservação de Preço, Baixa Única e Relatórios', async () => {
    const clientRes = await request(app.getHttpServer())
      .post('/api/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Cliente E2E', phone: '11999999999', email: 'cli@e2e.com' })
      .expect(201);
    clientId = clientRes.body.id;

    // Estoque insuficiente deve abortar venda e manter estoque 15
    await request(app.getHttpServer())
      .post('/api/sales')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        clientId,
        paymentType: PaymentType.A_PRAZO,
        items: [{ productId, quantity: 99 }],
      })
      .expect(400);

    expect(db.products.find((p) => p.id === productId).stock).toBe(15);

    // Venda válida a prazo pelo OPERADOR (2 * 3850 = 7700)
    const saleRes = await request(app.getHttpServer())
      .post('/api/sales')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send({
        clientId,
        paymentType: PaymentType.A_PRAZO,
        items: [{ productId, quantity: 2 }],
      })
      .expect(201);

    pendingSaleId = saleRes.body.id;
    expect(saleRes.body.paymentStatus).toBe(PaymentStatus.PENDENTE);
    expect(saleRes.body.total).toBe(7700);
    expect(db.products.find((p) => p.id === productId).stock).toBe(13);

    // Alteração de preço do produto não afeta o total/preço praticado na venda já emitida
    await request(app.getHttpServer())
      .patch(`/api/products/${productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ price: 5000 })
      .expect(200);

    // Baixa de pagamento única funciona 1x e rejeita a 2a tentativa
    const settleRes = await request(app.getHttpServer())
      .patch(`/api/sales/${pendingSaleId}/settle-payment`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(200);
    expect(settleRes.body.paymentStatus).toBe(PaymentStatus.PAGO);

    await request(app.getHttpServer())
      .patch(`/api/sales/${pendingSaleId}/settle-payment`)
      .set('Authorization', `Bearer ${operatorToken}`)
      .expect(400);

    // Relatório agrupado por cliente acessível ao ADMIN preserva valor 7700
    const reportRes = await request(app.getHttpServer())
      .get('/api/reports/by-client')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(reportRes.body.summary.grandTotalInCents).toBe(7700);
    expect(reportRes.body.summary.grandPaidInCents).toBe(7700);
    expect(reportRes.body.clients[0].sales[0].items[0].unitPrice).toBe(3850);
  });
});
