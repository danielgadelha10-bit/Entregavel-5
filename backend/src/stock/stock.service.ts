import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  async getMovements(productId?: string, limit: number = 50) {
    const where: any = {};
    if (productId) {
      where.productId = productId;
    }

    return this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        product: true,
        sale: {
          include: {
            client: true,
          },
        },
      },
    });
  }

  async getLowStock(threshold: number = 5) {
    return this.prisma.product.findMany({
      where: {
        active: true,
        stock: {
          lte: threshold,
        },
      },
      orderBy: { stock: 'asc' },
    });
  }
}
