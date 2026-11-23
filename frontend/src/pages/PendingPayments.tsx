import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Sale } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Modal } from '../components/Modal';
import { Clock, CheckCircle2, AlertCircle, DollarSign, User, Calendar } from 'lucide-react';

export const PendingPayments: React.FC = () => {
  const [pendingSales, setPendingSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal de Baixa de Pagamento
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [saleToSettle, setSaleToSettle] = useState<Sale | null>(null);
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSales();
  }, []);

  const fetchPendingSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/sales/pending-payments');
      setPendingSales(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar pagamentos pendentes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSettleModal = (sale: Sale) => {
    setSaleToSettle(sale);
    setSettleError(null);
    setIsSettleModalOpen(true);
  };

  const handleConfirmSettle = async () => {
    if (!saleToSettle) return;
    setSettling(true);
    setSettleError(null);

    try {
      await api.patch(`/sales/${saleToSettle.id}/settle-payment`);
      setIsSettleModalOpen(false);
      setActionSuccess(
        `Pagamento da venda #${saleToSettle.id.slice(0, 8)} de ${formatCurrency(
          saleToSettle.total,
        )} baixado com sucesso!`,
      );
      fetchPendingSales();

      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      console.error(err);
      setSettleError(
        err.response?.data?.message || 'Falha ao baixar pagamento. Tente novamente.',
      );
    } finally {
      setSettling(false);
    }
  };

  const totalPendingInCents = pendingSales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contas a Receber / Pagamentos Pendentes</h1>
          <p className="text-sm text-slate-500">
            Gerencie e realize a baixa de vendas a prazo pendentes de pagamento (baixa única permitida)
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl text-right">
          <p className="text-xs text-amber-800 font-semibold uppercase">Total a Receber</p>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(totalPendingInCents)}</p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Lista de Vendas Pendentes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Carregando pagamentos pendentes...</div>
        ) : pendingSales.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Tudo em dia!</p>
            <p className="text-sm text-slate-400 mt-1">
              Não existem pagamentos pendentes de baixa no momento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">ID / Venda</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Vendedor</th>
                  <th className="py-3.5 px-4">Data da Venda</th>
                  <th className="py-3.5 px-4">Valor em Aberto</th>
                  <th className="py-3.5 px-6 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs text-slate-600">
                      #{sale.id.slice(0, 8)}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-800">
                      {sale.client?.name}
                      <p className="text-xs text-slate-400 font-normal">{sale.client?.phone}</p>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600">{sale.seller?.name}</td>
                    <td className="py-4 px-4 text-xs text-slate-600">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="py-4 px-4 font-bold text-amber-600 text-base">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenSettleModal(sale)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Baixar Pagamento</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Baixa */}
      <Modal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        title="Confirmar Baixa de Pagamento"
      >
        {saleToSettle && (
          <div className="space-y-4">
            {settleError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{settleError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Venda:</span>
                <span className="font-mono font-semibold">#{saleToSettle.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold">{saleToSettle.client?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data da Venda:</span>
                <span>{formatDateTime(saleToSettle.createdAt)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-800">
                <span>Valor a Liquidar:</span>
                <span className="text-emerald-600 text-base">
                  {formatCurrency(saleToSettle.total)}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-xs text-blue-800 flex items-start gap-2">
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Esta ação marcará a venda como <strong>PAGA</strong> e registrará o momento exato da baixa. De acordo com a regra de negócio, o pagamento só pode ser baixado uma única vez.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={settling}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {settling ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Recebimento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
