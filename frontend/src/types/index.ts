export type Role = 'ADMIN' | 'OPERADOR';
export type PaymentType = 'A_VISTA' | 'A_PRAZO';
export type PaymentStatus = 'PAGO' | 'PENDENTE';
export type StockMovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  _count?: {
    sales: number;
  };
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  price: number; // centavos
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  _count?: {
    sales: number;
  };
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number; // centavos
  totalPrice: number; // centavos
  product?: Product;
}

export interface Sale {
  id: string;
  sellerId: string;
  clientId: string;
  paymentType: PaymentType;
  paymentStatus: PaymentStatus;
  total: number; // centavos
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  client: Client;
  seller: {
    id: string;
    name: string;
    email: string;
  };
  items: SaleItem[];
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  type: StockMovementType;
  reason: string;
  saleId?: string | null;
  createdAt: string;
  product?: Product;
  sale?: Sale | null;
}

export interface DashboardMetrics {
  financial: {
    totalRevenueInCents: number;
    totalPaidInCents: number;
    totalPendingInCents: number;
    monthRevenueInCents: number;
  };
  counts: {
    totalSales: number;
    totalProducts: number;
    lowStockProductsCount: number;
    totalClients: number;
    totalUsers: number;
  };
  recentSales: Sale[];
  lowStockProducts: Product[];
  chartData: {
    date: string;
    count: number;
    totalInCents: number;
  }[];
}

export interface ClientReportItem {
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  totalSalesCount: number;
  totalSpentInCents: number;
  totalPaidInCents: number;
  totalPendingInCents: number;
  sales: Sale[];
}

export interface ReportResponse {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalSalesCount: number;
    grandTotalInCents: number;
    grandPaidInCents: number;
    grandPendingInCents: number;
    clientsCount: number;
  };
  clients: ClientReportItem[];
}
