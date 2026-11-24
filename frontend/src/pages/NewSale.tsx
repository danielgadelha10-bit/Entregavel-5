import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Client, Product } from '../types';
import { formatCurrency, extractApiErrorMessage } from '../utils/formatters';
import {
  ShoppingCart,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  DollarSign,
  User,
  Package,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

export const NewSale: React.FC = () => {
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentType, setPaymentType] = useState<'A_VISTA' | 'A_PRAZO'>('A_VISTA');
  const [cart, setCart] = useState<CartItem[]>([]);

  // Item Picker State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemError, setItemError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingInitial(true);
      const [resClients, resProducts] = await Promise.all([
        api.get('/clients'),
        api.get('/products', { params: { activeOnly: true } }),
      ]);
      setClients(resClients.data);
      setProducts(resProducts.data);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar clientes ou produtos disponíveis');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleAddToCart = () => {
    setItemError(null);
    if (!selectedProductId) {
      setItemError('Selecione um produto');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    if (itemQuantity <= 0) {
      setItemError('A quantidade deve ser de pelo menos 1');
      return;
    }

    // Verificar se já está no carrinho e se a quantidade combinada excede o estoque
    const existingIndex = cart.findIndex((item) => item.product.id === prod.id);
    const existingQty = existingIndex >= 0 ? cart[existingIndex].quantity : 0;
    const requestedTotal = existingQty + itemQuantity;

    if (requestedTotal > prod.stock) {
      setItemError(
        `Estoque insuficiente. Estoque disponível: ${prod.stock}. Já no carrinho: ${existingQty}.`,
      );
      return;
    }

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity = requestedTotal;
      setCart(updated);
    } else {
      setCart([...cart, { product: prod, quantity: itemQuantity }]);
    }

    // Reset picker
    setSelectedProductId('');
    setItemQuantity(1);
  };

  const handleRemoveFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const handleUpdateCartQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const item = cart[index];
    if (newQty > item.product.stock) {
      alert(`Quantidade máxima em estoque é ${item.product.stock}`);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  // Cálculo total em centavos
  const grandTotalInCents = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );

  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedClientId) {
      setError('Por favor, selecione um cliente para a venda.');
      return;
    }

    if (cart.length === 0) {
      setError('Adicione pelo menos um produto ao pedido antes de finalizar.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        clientId: selectedClientId,
        paymentType,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      const res = await api.post('/sales', payload);
      setSuccessMsg(
        paymentType === 'A_VISTA'
          ? 'Venda concluída com sucesso! Pagamento registrado como PAGO.'
          : 'Venda a prazo registrada com sucesso! Pagamento pendente.',
      );

      // Redireciona após 1.5s
      setTimeout(() => {
        if (paymentType === 'A_PRAZO') {
          navigate('/payments/pending');
        } else {
          navigate('/sales');
        }
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(
        extractApiErrorMessage(err, 'Falha ao processar venda. Verifique o estoque dos itens.'),
      );
      setSubmitting(false);
    }
  };

  const selectedProductObj = products.find((p) => p.id === selectedProductId);

  if (loadingInitial) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 text-sm">Carregando dados para venda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Nova Venda / Ponto de Venda</h1>
        <p className="text-sm text-slate-500">
          Registre pedidos com baixa automática de estoque e condições de pagamento
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex items-center gap-3 font-semibold">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmitSale} className="space-y-6">
        {/* Seção 1: Seleção de Cliente e Condição de Pagamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Cliente *</span>
            </label>
            <select
              required
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="">-- Selecione o cliente --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>Condição de Pagamento *</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType('A_VISTA')}
                className={`py-2.5 px-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentType === 'A_VISTA'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>À Vista (Pago)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('A_PRAZO')}
                className={`py-2.5 px-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  paymentType === 'A_PRAZO'
                    ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>A Prazo (Pendente)</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {paymentType === 'A_VISTA'
                ? 'Pagamento liquidado de imediato.'
                : 'Ficará disponível em Pagamentos Pendentes para baixa futura.'}
            </p>
          </div>
        </div>

        {/* Seção 2: Adicionar Produtos */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Adicionar Produtos ao Pedido</h2>
          </div>

          {itemError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{itemError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Produto
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">-- Escolha um produto --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name} — {formatCurrency(p.price)} / {p.unit} ({p.stock} em estoque)
                    {p.stock <= 0 ? ' [ESGOTADO]' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Quantidade
              </label>
              <input
                type="number"
                min="1"
                max={selectedProductObj?.stock || 9999}
                value={itemQuantity}
                onChange={(e) => setItemQuantity(parseInt(e.target.value || '1', 10))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Seção 3: Itens no Carrinho */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-800 text-sm">Itens da Venda ({cart.length})</h3>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-red-600 hover:underline"
              >
                Esvaziar lista
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhum item adicionado à venda. Selecione um produto acima e clique em Adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-6">Produto</th>
                    <th className="py-3 px-4 text-center">Qtd.</th>
                    <th className="py-3 px-4">Preço Unit.</th>
                    <th className="py-3 px-4">Subtotal</th>
                    <th className="py-3 px-4 text-right">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((item, index) => {
                    const subtotal = item.product.price * item.quantity;
                    return (
                      <tr key={item.product.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-6 font-semibold text-slate-800">
                          {item.product.name}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.product.stock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateCartQuantity(index, parseInt(e.target.value || '1', 10))
                            }
                            className="w-16 text-center border border-slate-200 rounded px-1.5 py-1 text-sm outline-none font-mono"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {formatCurrency(item.product.price)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {formatCurrency(subtotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(index)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Rodapé com Total e Botão de Finalizar */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Total a Pagar</p>
              <p className="text-3xl font-extrabold text-blue-600">
                {formatCurrency(grandTotalInCents)}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || !!successMsg || cart.length === 0}
              className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Finalizar e Registrar Venda</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
