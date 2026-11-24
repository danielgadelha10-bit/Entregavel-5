import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaymentStatus, PaymentType, Prisma, Role, StockMovementType } from '@prisma/client';
import { buildCreatedAtFilter } from '../common/date-range.util';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(sellerId: string, dto: CreateSaleDto) {
    // Consolidar eventuais itens repetidos do mesmo produto para validação única de estoque
    const consolidatedMap = new Map<string, number>();
    for (const item of dto.items) {
      consolidatedMap.set(item.productId, (consolidatedMap.get(item.productId) || 0) + item.quantity);
    }
    const items = Array.from(consolidatedMap.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    // Transação PostgreSQL completa: se faltar estoque para qualquer produto, cancela toda a venda
    return this.prisma.$transaction(async (tx) => {
      // 1. Validar cliente
      const client = await tx.client.findUnique({
        where: { id: dto.clientId },
      });

      if (!client) {
        throw new NotFoundException('Cliente não encontrado');
      }

      // 2. Validar produtos e calcular totais
      let grandTotalInCents = 0;
      const preparedItems: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        productName: string;
      }[] = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Produto com ID ${item.productId} não foi encontrado`);
        }

        if (!product.active) {
          throw new BadRequestException(`O produto "${product.name}" está inativo para novas vendas`);
        }

        // Validação estrita de estoque
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto "${product.name}". Solicitado: ${item.quantity}, disponível: ${product.stock}. Toda a venda foi cancelada.`,
          );
        }

        const unitPrice = product.price; // Preserva o preço original no momento da venda
        const totalPrice = unitPrice * item.quantity;
        grandTotalInCents += totalPrice;

        preparedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          productName: product.name,
        });

        // 3. Atualizar estoque imediatamente dentro da transação (atômico contra concorrência)
        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (updatedProduct && updatedProduct.stock < 0) {
          throw new BadRequestException(
            `Estoque insuficiente para o produto "${product.name}". Toda a venda foi cancelada.`,
          );
        }
      }

      // 4. Determinar status de pagamento inicial
      const isCash = dto.paymentType === PaymentType.A_VISTA;
      const paymentStatus = isCash ? PaymentStatus.PAGO : PaymentStatus.PENDENTE;
      const paidAt = isCash ? new Date() : null;

      // 5. Criar registro de venda
      const sale = await tx.sale.create({
        data: {
          sellerId,
          clientId: dto.clientId,
          paymentType: dto.paymentType,
          paymentStatus,
          total: grandTotalInCents,
          paidAt,
          items: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
        include: {
          client: true,
          seller: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: { product: true },
          },
        },
      });

      // 6. Registrar histórico de movimentações de estoque
      for (const item of preparedItems) {
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: StockMovementType.SAIDA,
            reason: `Venda #${sale.id.slice(0, 8)} - Cliente: ${client.name}`,
            saleId: sale.id,
          },
        });
      }

      return sale;
    });
  }

  // Baixa de pagamentos pendentes apenas uma vez
  async settlePayment(saleId: string, user?: { id: string; role: Role }) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const sale = await tx.sale.findUnique({
            where: { id: saleId },
            include: {
              client: true,
              seller: { select: { id: true, name: true, email: true } },
              items: { include: { product: true } },
            },
          });

          if (!sale) {
            throw new NotFoundException('Venda não encontrada');
          }

          if (user && user.role === Role.OPERADOR && sale.sellerId !== user.id) {
            throw new ForbiddenException(
              'Acesso negado: você só pode baixar pagamentos das suas próprias vendas',
            );
          }

          if (sale.paymentStatus === PaymentStatus.PAGO) {
            const formattedDate = sale.paidAt ? new Date(sale.paidAt).toLocaleString('pt-BR') : '';
            throw new BadRequestException(
              `Este pagamento já foi baixado anteriormente${formattedDate ? ' em ' + formattedDate : ''}. Não é permitido baixar mais de uma vez.`,
            );
          }

          const updatedSale = await tx.sale.update({
            where: { id: saleId },
            data: {
              paymentStatus: PaymentStatus.PAGO,
              paidAt: new Date(),
            },
            include: {
              client: true,
              seller: { select: { id: true, name: true, email: true } },
              items: { include: { product: true } },
            },
          });

          return updatedSale;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (err: any) {
      if (err?.code === 'P2034') {
        throw new BadRequestException(
          'Este pagamento já está sendo baixado por outra solicitação. Não é permitido baixar mais de uma vez.',
        );
      }
      throw err;
    }
  }

  async findAll(user: { id: string; role: Role }, filters?: {
    startDate?: string;
    endDate?: string;
    clientId?: string;
    paymentStatus?: PaymentStatus;
    paymentType?: PaymentType;
  }) {
    const where: any = {};

    // Regra: OPERADOR só consulta suas próprias vendas; ADMIN consulta todas
    if (user.role === Role.OPERADOR) {
      where.sellerId = user.id;
    }

    if (filters?.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters?.paymentType) {
      where.paymentType = filters.paymentType;
    }

    const createdAtFilter = buildCreatedAtFilter(filters?.startDate, filters?.endDate);
    if (createdAtFilter) {
      where.createdAt = createdAtFilter;
    }

    return this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });
  }

  async findOne(id: string, user: { id: string; role: Role }) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
        },
        stockMovements: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    if (user.role === Role.OPERADOR && sale.sellerId !== user.id) {
      throw new ForbiddenException('Acesso negado: você só pode consultar suas próprias vendas');
    }

    return sale;
  }

  async findPendingPayments(user: { id: string; role: Role }) {
    const where: any = {
      paymentStatus: PaymentStatus.PENDENTE,
    };

    if (user.role === Role.OPERADOR) {
      where.sellerId = user.id;
    }

    return this.prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
        },
      },
    });
  }
}
