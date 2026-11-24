import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, Role } from '@prisma/client';
import { formatLocalDateKey } from '../common/date-range.util';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(user: { id: string; role: Role }) {
    const isOperador = user.role === Role.OPERADOR;
    const saleWhere: any = isOperador ? { sellerId: user.id } : {};

    // 1. Total faturado, recebido e pendente
    const sales = await this.prisma.sale.findMany({
      where: saleWhere,
      select: {
        total: true,
        paymentStatus: true,
        createdAt: true,
      },
    });

    let totalRevenueInCents = 0;
    let totalPaidInCents = 0;
    let totalPendingInCents = 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let monthRevenueInCents = 0;

    for (const sale of sales) {
      totalRevenueInCents += sale.total;
      if (sale.paymentStatus === PaymentStatus.PAGO) {
        totalPaidInCents += sale.total;
      } else {
        totalPendingInCents += sale.total;
      }

      if (sale.createdAt >= startOfMonth) {
        monthRevenueInCents += sale.total;
      }
    }

    // 2. Contadores
    const [totalProducts, lowStockProductsCount, totalClients, totalUsers] = await Promise.all([
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.product.count({ where: { active: true, stock: { lte: 5 } } }),
      this.prisma.client.count(),
      this.prisma.user.count(),
    ]);

    // 3. Últimas 5 vendas
    const recentSales = await this.prisma.sale.findMany({
      where: saleWhere,
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
      },
    });

    // 4. Produtos com estoque baixo
    const lowStockProducts = await this.prisma.product.findMany({
      where: { active: true, stock: { lte: 5 } },
      take: 5,
      orderBy: { stock: 'asc' },
    });

    // 5. Vendas nos últimos 7 dias para visualização gráfica
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const salesLast7Days = await this.prisma.sale.findMany({
      where: {
        ...saleWhere,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    // Agrupar por dia YYYY-MM-DD (no fuso local consistente com sevenDaysAgo)
    const dailyMap: { [date: string]: { count: number; totalInCents: number } } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = formatLocalDateKey(d);
      dailyMap[key] = { count: 0, totalInCents: 0 };
    }

    for (const s of salesLast7Days) {
      const key = formatLocalDateKey(s.createdAt);
      if (dailyMap[key]) {
        dailyMap[key].count += 1;
        dailyMap[key].totalInCents += s.total;
      }
    }

    const chartData = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      count: data.count,
      totalInCents: data.totalInCents,
    }));

    return {
      financial: {
        totalRevenueInCents,
        totalPaidInCents,
        totalPendingInCents,
        monthRevenueInCents,
      },
      counts: {
        totalSales: sales.length,
        totalProducts,
        lowStockProductsCount,
        totalClients,
        totalUsers,
      },
      recentSales,
      lowStockProducts,
      chartData,
    };
  }
}
