import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Sale } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  formatCurrency,
  formatDateTime,
  toStartOfDayIso,
  toEndOfDayIso,
  extractApiErrorMessage,
} from '../utils/formatters';
import { Modal } from '../components/Modal';
import { Receipt, Eye, Filter, Calendar, User, DollarSign, Clock, CheckCircle } from 'lucide-react';

export const SalesHistory: React.FC = () => {
  const { isOperador } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('');

  // Modal de Detalhes
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate, paymentStatus, paymentType]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: any = {};
      if (startDate) params.startDate = toStartOfDayIso(startDate);
      if (endDate) params.endDate = toEndOfDayIso(endDate);
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (paymentType) params.paymentType = paymentType;

      const res = await api.get('/sales', { params });
      setSales(res.data);
    } catch (err: any) {
      console.error(err);
      setError(extractApiErrorMessage(err, 'Erro ao carregar histórico de vendas'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Histórico de Vendas</h1>
        <p className="text-sm text-slate-500">
          {isOperador
            ? 'Visualizando suas vendas registradas no sistema'
            : 'Consulta e auditoria de todas as vendas da empresa'}
        </p>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Status Pagamento
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Todos</option>
            <option value="PAGO">Pago</option>
            <option value="PENDENTE">Pendente</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Forma de Pagamento
          </label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Todas</option>
            <option value="A_VISTA">À Vista</option>
            <option value="A_PRAZO">A Prazo</option>
          </select>
        </div>
      </div>

      {/* Tabela de Vendas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Carregando histórico...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Nenhuma venda encontrada</p>
            <p className="text-sm text-slate-400 mt-1">Ajuste os filtros para pesquisar outros períodos.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">ID / Data</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Vendedor</th>
                  <th className="py-3.5 px-4">Forma</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Valor Total</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-mono text-xs text-slate-500">#{sale.id.slice(0, 8)}</p>
                      <p className="text-xs text-slate-700 mt-0.5">{formatDateTime(sale.createdAt)}</p>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-800">{sale.client?.name}</td>
                    <td className="py-4 px-4 text-slate-600 text-xs">{sale.seller?.name}</td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-medium text-slate-700">
                        {sale.paymentType === 'A_VISTA' ? 'À Vista' : 'A Prazo'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sale.paymentStatus === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {sale.paymentStatus === 'PAGO' ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            PAGO
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            PENDENTE
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-900">{formatCurrency(sale.total)}</td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenDetails(sale)}
                        title="Ver detalhes da venda"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Detalhes</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Venda */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Detalhes da Venda #${selectedSale?.id.slice(0, 8)}`}
        maxWidth="2xl"
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Informações Gerais */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
              <div>
                <p className="text-slate-400 font-semibold uppercase">Cliente</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedSale.client?.name}</p>
                <p className="text-slate-500">{selectedSale.client?.phone}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Vendedor</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedSale.seller?.name}</p>
                <p className="text-slate-500">{selectedSale.seller?.email}</p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Data e Hora</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {formatDateTime(selectedSale.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-semibold uppercase">Status do Pagamento</p>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedSale.paymentStatus === 'PAGO' ? 'Pago' : 'Pendente de Pagamento'}
                  {selectedSale.paidAt && ` (em ${formatDateTime(selectedSale.paidAt)})`}
                </p>
              </div>
            </div>

            {/* Tabela de Produtos Vendidos */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Produtos Vendidos
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Item</th>
                      <th className="py-2.5 px-3 text-center">Qtd.</th>
                      <th className="py-2.5 px-3">Preço Praticado</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          {item.product?.name || 'Produto'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {item.quantity} {item.product?.unit || 'UN'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Geral */}
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-sm font-semibold text-blue-900">Valor Total da Venda</span>
              <span className="text-xl font-bold text-blue-700">
                {formatCurrency(selectedSale.total)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
