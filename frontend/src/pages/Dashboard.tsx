import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { DashboardMetrics } from '../types';
import { StatCard } from '../components/StatCard';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Package,
  AlertTriangle,
  Users,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/metrics');
      setMetrics(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Falha ao carregar métricas do dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm">Carregando indicadores...</p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-xl">
        <p className="font-semibold">{error || 'Erro ao carregar dados'}</p>
        <button
          onClick={fetchMetrics}
          className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Encontrar o maior valor do gráfico para calibrar a altura das barras
  const maxDayRevenue = Math.max(...metrics.chartData.map((d) => d.totalInCents), 1);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel Geral</h1>
          <p className="text-sm text-slate-500">
            Acompanhe o desempenho de vendas, faturamento e estoque em tempo real
          </p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all w-fit"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Registrar Nova Venda</span>
        </Link>
      </div>

      {/* Grid de Cards Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Faturamento Total"
          value={formatCurrency(metrics.financial.totalRevenueInCents)}
          subtitle="Valor acumulado de vendas"
          icon={<DollarSign className="w-6 h-6" />}
          color="blue"
        />
        <StatCard
          title="Faturamento no Mês"
          value={formatCurrency(metrics.financial.monthRevenueInCents)}
          subtitle="Vendas no mês corrente"
          icon={<TrendingUp className="w-6 h-6" />}
          color="emerald"
        />
        <StatCard
          title="Total Recebido"
          value={formatCurrency(metrics.financial.totalPaidInCents)}
          subtitle="À vista e baixas efetuadas"
          icon={<CheckCircle className="w-6 h-6" />}
          color="purple"
        />
        <StatCard
          title="A Receber (Pendentes)"
          value={formatCurrency(metrics.financial.totalPendingInCents)}
          subtitle="Vendas a prazo em aberto"
          icon={<Clock className="w-6 h-6" />}
          color="amber"
        />
      </div>

      {/* Grid de Operações e Estoque */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total de Vendas</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.counts.totalSales}</p>
            <Link to="/sales" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5">
              Ver histórico <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Produtos Ativos</p>
            <p className="text-2xl font-bold text-slate-800">{metrics.counts.totalProducts}</p>
            <Link to="/products" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-0.5">
              Gerenciar catálogo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Alerta de Estoque Baixo</p>
            <p className="text-2xl font-bold text-amber-600">{metrics.counts.lowStockProductsCount}</p>
            <span className="text-xs text-slate-400">itens com 5 ou menos unid.</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Vendas dos últimos 7 dias */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Faturamento Diário (Últimos 7 Dias)</h2>
            <p className="text-xs text-slate-500">Volume monetário faturado dia a dia</p>
          </div>
        </div>

        <div className="h-56 flex items-end justify-between gap-2 sm:gap-6 pt-6 pb-2 border-b border-slate-100">
          {metrics.chartData.map((d) => {
            const heightPercent = Math.max(Math.round((d.totalInCents / maxDayRevenue) * 100), 4);
            const dateObj = new Date(d.date + 'T00:00:00');
            const dayLabel = dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });

            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                {/* Tooltip */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-2.5 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-10">
                  <p className="font-semibold">{formatCurrency(d.totalInCents)}</p>
                  <p className="text-[10px] text-slate-300">{d.count} venda(s)</p>
                </div>

                {/* Barra */}
                <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-44">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      d.totalInCents > 0
                        ? 'bg-blue-600 group-hover:bg-blue-700'
                        : 'bg-slate-200'
                    }`}
                  />
                </div>

                {/* Rótulo de Data */}
                <span className="text-xs text-slate-500 font-medium capitalize truncate w-full text-center">
                  {dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid de Tabelas: Vendas Recentes e Alerta de Estoque */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas Recentes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Últimas Vendas</h3>
            <Link to="/sales" className="text-xs font-semibold text-blue-600 hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {metrics.recentSales.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">Nenhuma venda registrada ainda</p>
            ) : (
              metrics.recentSales.map((sale) => (
                <div key={sale.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{sale.client.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vendedor: {sale.seller.name} • {formatDateTime(sale.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-800">{formatCurrency(sale.total)}</p>
                    <span
                      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                        sale.paymentStatus === 'PAGO'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {sale.paymentStatus === 'PAGO' ? 'PAGO' : 'PENDENTE'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Produtos com Estoque Baixo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-slate-800 text-sm">Alerta: Estoque Baixo (≤ 5 un.)</h3>
            </div>
            <Link to="/products" className="text-xs font-semibold text-blue-600 hover:underline">
              Ir para produtos
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {metrics.lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-sm text-emerald-600 flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Nenhum produto em nível crítico de estoque!</span>
              </div>
            ) : (
              metrics.lowStockProducts.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Preço: {formatCurrency(p.price)} / {p.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
                      {p.stock} {p.unit} em estoque
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
