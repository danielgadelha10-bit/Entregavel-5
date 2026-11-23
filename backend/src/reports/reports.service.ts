import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReportByClient(startDate?: string, endDate?: string) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sales = await this.prisma.sale.findMany({
      where,
      include: {
        client: true,
        seller: { select: { id: true, name: true, email: true } },
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Agrupamento por cliente
    const clientMap = new Map<string, {
      client: { id: string; name: string; email: string; phone: string };
      totalSalesCount: number;
      totalSpentInCents: number;
      totalPaidInCents: number;
      totalPendingInCents: number;
      sales: typeof sales;
    }>();

    let grandTotalInCents = 0;
    let grandPaidInCents = 0;
    let grandPendingInCents = 0;

    for (const sale of sales) {
      grandTotalInCents += sale.total;
      if (sale.paymentStatus === PaymentStatus.PAGO) {
        grandPaidInCents += sale.total;
      } else {
        grandPendingInCents += sale.total;
      }

      if (!clientMap.has(sale.clientId)) {
        clientMap.set(sale.clientId, {
          client: sale.client,
          totalSalesCount: 0,
          totalSpentInCents: 0,
          totalPaidInCents: 0,
          totalPendingInCents: 0,
          sales: [],
        });
      }

      const clientData = clientMap.get(sale.clientId)!;
      clientData.totalSalesCount += 1;
      clientData.totalSpentInCents += sale.total;
      if (sale.paymentStatus === PaymentStatus.PAGO) {
        clientData.totalPaidInCents += sale.total;
      } else {
        clientData.totalPendingInCents += sale.total;
      }
      clientData.sales.push(sale);
    }

    const groupedClients = Array.from(clientMap.values()).sort(
      (a, b) => b.totalSpentInCents - a.totalSpentInCents,
    );

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary: {
        totalSalesCount: sales.length,
        grandTotalInCents,
        grandPaidInCents,
        grandPendingInCents,
        clientsCount: groupedClients.length,
      },
      clients: groupedClients,
    };
  }
}
