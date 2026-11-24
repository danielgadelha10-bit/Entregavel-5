import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { ReportResponse } from '../types';
import {
  formatCurrency,
  formatDateTime,
  getLocalDateInputValue,
  toStartOfDayIso,
  toEndOfDayIso,
  extractApiErrorMessage,
} from '../utils/formatters';
import {
  BarChart3,
  Calendar,
  Filter,
  Printer,
  ChevronDown,
  ChevronUp,
  User,
  CheckCircle,
  Clock,
  DollarSign,
  ShoppingBag,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de Data: padrão mês atual (no fuso horário local)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return getLocalDateInputValue(d);
  });
  const [endDate, setEndDate] = useState(() => getLocalDateInputValue());

  // Estado para expandir/recolher vendas por cliente
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/by-client', {
        params: {
          startDate: startDate ? toStartOfDayIso(startDate) : undefined,
          endDate: endDate ? toEndOfDayIso(endDate) : undefined,
        },
      });
      setReport(res.data);
    } catch (err: any) {
      console.error(err);
      setError(extractApiErrorMessage(err, 'Erro ao gerar relatório por cliente'));
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedClientId(expandedClientId === id ? null : id);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatório Comercial por Cliente</h1>
          <p className="text-sm text-slate-500">
            Demonstrativo de vendas agrupado por cliente no período selecionado
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir / Salvar PDF</span>
        </button>
      </div>

      {/* Filtros de Data */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>Período:</span>
        </div>
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <span className="text-slate-400">até</span>
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={fetchReport}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Filtrar
        </button>
      </div>

      {/* Cards de Resumo */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Faturamento no Período</p>
            <p className="text-xl font-bold text-blue-600 mt-1">
              {formatCurrency(report.summary.grandTotalInCents)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{report.summary.totalSalesCount} pedidos emitidos</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Liquidado (Pago)</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">
              {formatCurrency(report.summary.grandPaidInCents)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Recebidos no período</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">A Receber (Pendente)</p>
            <p className="text-xl font-bold text-amber-600 mt-1">
              {formatCurrency(report.summary.grandPendingInCents)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Pendentes de baixa</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase">Clientes Compradores</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{report.summary.clientsCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Com pedidos no período</p>
          </div>
        </div>
      )}

      {/* Tabela Agrupada por Cliente */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Gerando relatório por cliente...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : !report || report.clients.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Nenhum dado encontrado para o período</p>
            <p className="text-sm text-slate-400 mt-1">Selecione outro intervalo de datas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {report.clients.map((item) => {
              const isExpanded = expandedClientId === item.client.id;
              return (
                <div key={item.client.id} className="transition-colors">
                  {/* Linha do Cliente */}
                  <div
                    onClick={() => toggleExpand(item.client.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {item.client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">{item.client.name}</h3>
                        <p className="text-xs text-slate-500">
                          {item.client.phone} • {item.client.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-semibold">Total em Compras</p>
                        <p className="font-bold text-slate-900 text-base">
                          {formatCurrency(item.totalSpentInCents)}
                        </p>
                        <p className="text-xs text-slate-500">{item.totalSalesCount} pedido(s)</p>
                      </div>

                      <div className="hidden sm:block text-right">
                        <p className="text-xs text-emerald-600 font-semibold">
                          Pago: {formatCurrency(item.totalPaidInCents)}
                        </p>
                        {item.totalPendingInCents > 0 && (
                          <p className="text-xs text-amber-600 font-semibold">
                            Pendente: {formatCurrency(item.totalPendingInCents)}
                          </p>
                        )}
                      </div>

                      <div className="text-slate-400 print:hidden">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vendas Expandidas do Cliente */}
                  {(isExpanded || window.matchMedia('print').matches) && (
                    <div className="bg-slate-50/60 p-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Pedidos deste cliente no período:
                      </h4>
                      <div className="space-y-3">
                        {item.sales.map((sale) => (
                          <div
                            key={sale.id}
                            className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs shadow-xs"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <span className="font-mono text-slate-500">
                                #{sale.id.slice(0, 8)} • {formatDateTime(sale.createdAt)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold ${
                                  sale.paymentStatus === 'PAGO'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {sale.paymentStatus} ({sale.paymentType === 'A_VISTA' ? 'À Vista' : 'A Prazo'})
                              </span>
                            </div>

                            {/* Itens */}
                            <div className="space-y-1">
                              {sale.items.map((it) => (
                                <div key={it.id} className="flex justify-between text-slate-600">
                                  <span>
                                    {it.quantity}x {it.product?.name || 'Item'}
                                  </span>
                                  <span className="font-medium text-slate-800">
                                    {formatCurrency(it.totalPrice)}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2 mt-2">
                              <span>Total do Pedido:</span>
                              <span className="text-blue-600">{formatCurrency(sale.total)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
