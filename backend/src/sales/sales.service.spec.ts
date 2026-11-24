import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, PaymentType, Role, StockMovementType } from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('SalesService (Regras de Vendas, Estoque e Pagamentos)', () => {
  let service: SalesService;
  let txMock: any;
  let prisma: any;

  beforeEach(async () => {
    txMock = {
      client: {
        findUnique: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sale: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
    };

    prisma = {
      $transaction: jest.fn((callback) => callback(txMock)),
      sale: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  it('deve cancelar TODA a venda se o estoque de qualquer produto for insuficiente', async () => {
    txMock.client.findUnique.mockResolvedValue({ id: 'client-1', name: 'Cliente Teste' });

    // Produto 1 tem estoque 10, solicitado 2
    // Produto 2 tem estoque 1, solicitado 5 (ESTOQUE INSUFICIENTE)
    txMock.product.findUnique
      .mockResolvedValueOnce({
        id: 'prod-1',
        name: 'Produto Com Estoque',
        price: 1500, // R$ 15,00 em centavos
        stock: 10,
        active: true,
      })
      .mockResolvedValueOnce({
        id: 'prod-2',
        name: 'Produto Sem Estoque Suficiente',
        price: 3000, // R$ 30,00 em centavos
        stock: 1, // Estoque disponível: 1
        active: true,
      });

    await expect(
      service.create('seller-1', {
        clientId: 'client-1',
        paymentType: PaymentType.A_VISTA,
        items: [
          { productId: 'prod-1', quantity: 2 },
          { productId: 'prod-2', quantity: 5 }, // Solicitou 5, tem 1
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    // Garante que a transação abortou e nenhuma venda foi criada
    expect(txMock.sale.create).not.toHaveBeenCalled();
  });

  it('deve consolidar itens repetidos e cancelar venda se soma exceder estoque', async () => {
    txMock.client.findUnique.mockResolvedValue({ id: 'client-1', name: 'Cliente Teste' });
    txMock.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Produto Único',
      price: 1000,
      stock: 5,
      active: true,
    });

    await expect(
      service.create('seller-1', {
        clientId: 'client-1',
        paymentType: PaymentType.A_VISTA,
        items: [
          { productId: 'prod-1', quantity: 3 },
          { productId: 'prod-1', quantity: 4 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(txMock.product.update).not.toHaveBeenCalled();
    expect(txMock.sale.create).not.toHaveBeenCalled();
  });

  it('deve criar venda A_PRAZO com status PENDENTE e preservar preço em centavos', async () => {
    txMock.client.findUnique.mockResolvedValue({ id: 'client-1', name: 'Empresa Alpha' });

    txMock.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Tinta 18L',
      price: 25000, // R$ 250,00 em centavos
      stock: 20,
      active: true,
    });

    txMock.sale.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'sale-uuid-1',
        ...data,
      }),
    );

    const sale = await service.create('seller-1', {
      clientId: 'client-1',
      paymentType: PaymentType.A_PRAZO,
      items: [{ productId: 'prod-1', quantity: 2 }],
    });

    expect(sale.paymentStatus).toBe(PaymentStatus.PENDENTE);
    expect(sale.paidAt).toBeNull();
    expect(sale.total).toBe(50000); // 2 * 25000 = 50000 centavos (R$ 500,00)

    // Verifica se atualizou o estoque decrementando a quantidade
    expect(txMock.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stock: { decrement: 2 } },
    });

    // Verifica se gerou movimentação de estoque
    expect(txMock.stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: 'prod-1',
          quantity: 2,
          type: StockMovementType.SAIDA,
        }),
      }),
    );
  });

  it('deve criar venda A_VISTA com status PAGO e paidAt preenchido', async () => {
    txMock.client.findUnique.mockResolvedValue({ id: 'client-1', name: 'Cliente Avulso' });
    txMock.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Chave Philips',
      price: 2500, // R$ 25,00
      stock: 10,
      active: true,
    });

    txMock.sale.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'sale-uuid-2',
        ...data,
      }),
    );

    const sale = await service.create('seller-1', {
      clientId: 'client-1',
      paymentType: PaymentType.A_VISTA,
      items: [{ productId: 'prod-1', quantity: 1 }],
    });

    expect(sale.paymentStatus).toBe(PaymentStatus.PAGO);
    expect(sale.paidAt).toBeInstanceOf(Date);
    expect(sale.total).toBe(2500);
  });

  it('deve realizar a baixa de pagamento pendente com sucesso na primeira vez', async () => {
    txMock.sale.findUnique.mockResolvedValue({
      id: 'sale-pendente',
      sellerId: 'seller-1',
      paymentStatus: PaymentStatus.PENDENTE,
      paidAt: null,
      total: 10000,
    });

    txMock.sale.update.mockResolvedValue({
      id: 'sale-pendente',
      sellerId: 'seller-1',
      paymentStatus: PaymentStatus.PAGO,
      paidAt: new Date(),
      total: 10000,
    });

    const result = await service.settlePayment('sale-pendente', {
      id: 'seller-1',
      role: Role.OPERADOR,
    });
    expect(result.paymentStatus).toBe(PaymentStatus.PAGO);
    expect(txMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sale-pendente' },
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.PAGO,
        }),
      }),
    );
  });

  it('deve PROIBIR OPERADOR de baixar pagamento de venda de outro vendedor', async () => {
    txMock.sale.findUnique.mockResolvedValue({
      id: 'sale-outro',
      sellerId: 'seller-2',
      paymentStatus: PaymentStatus.PENDENTE,
      paidAt: null,
      total: 10000,
    });

    await expect(
      service.settlePayment('sale-outro', { id: 'seller-1', role: Role.OPERADOR }),
    ).rejects.toThrow(ForbiddenException);
    expect(txMock.sale.update).not.toHaveBeenCalled();
  });

  it('deve PROIBIR e rejeitar nova baixa se o pagamento já estiver PAGO', async () => {
    txMock.sale.findUnique.mockResolvedValue({
      id: 'sale-ja-paga',
      sellerId: 'seller-1',
      paymentStatus: PaymentStatus.PAGO,
      paidAt: new Date('2026-11-20T10:00:00Z'),
      total: 10000,
    });

    await expect(service.settlePayment('sale-ja-paga')).rejects.toThrow(BadRequestException);
    expect(txMock.sale.update).not.toHaveBeenCalled();
  });
});
