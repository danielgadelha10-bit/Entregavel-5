import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, parseCurrencyToCents, centsToDecimalString } from '../utils/formatters';
import { Modal } from '../components/Modal';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Sliders,
  AlertCircle,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';

export const Products: React.FC = () => {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('UN');
  const [priceInput, setPriceInput] = useState('');
  const [stock, setStock] = useState(0);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal de Ajuste Rápido de Estoque
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAdjustmentQty, setStockAdjustmentQty] = useState(1);
  const [stockAdjustmentType, setStockAdjustmentType] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE'>('ENTRADA');
  const [stockAdjustmentReason, setStockAdjustmentReason] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: { search: search || undefined },
      });
      setProducts(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setUnit('UN');
    setPriceInput('');
    setStock(0);
    setActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setUnit(p.unit);
    setPriceInput(centsToDecimalString(p.price));
    setStock(p.stock);
    setActive(p.active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenStockModal = (p: Product) => {
    setStockProduct(p);
    setStockAdjustmentQty(1);
    setStockAdjustmentType('ENTRADA');
    setStockAdjustmentReason('');
    setFormError(null);
    setIsStockModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    const priceInCents = parseCurrencyToCents(priceInput);
    if (priceInCents < 0) {
      setFormError('O preço não pode ser negativo');
      setSaving(false);
      return;
    }

    try {
      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, {
          name,
          unit,
          price: priceInCents,
          stock: Number(stock),
          active,
        });
      } else {
        await api.post('/products', {
          name,
          unit,
          price: priceInCents,
          stock: Number(stock),
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Falha ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockProduct) return;
    setFormError(null);
    setSaving(true);

    try {
      await api.post(`/products/${stockProduct.id}/adjust-stock`, {
        quantity: Number(stockAdjustmentQty),
        type: stockAdjustmentType,
        reason: stockAdjustmentReason || 'Ajuste manual de estoque pelo painel',
      });
      setIsStockModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.message || 'Erro ao ajustar estoque');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Catálogo de Produtos</h1>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Gerencie produtos, unidades, preços e estoque com histórico'
              : 'Consulte os produtos cadastrados e disponibilidade em estoque'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        )}
      </div>

      {/* Barra de Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome do produto..."
          className="w-full text-sm outline-none bg-transparent placeholder-slate-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Lista de Produtos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Carregando catálogo de produtos...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Nenhum produto encontrado</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? 'Tente buscar com outros termos.' : 'Cadastre o primeiro produto para iniciar as vendas.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Produto</th>
                  <th className="py-3.5 px-4">Unidade</th>
                  <th className="py-3.5 px-4">Preço (R$)</th>
                  <th className="py-3.5 px-4">Estoque</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isAdmin && <th className="py-3.5 px-6 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isLow = p.stock <= 5;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-4 px-4 font-mono text-slate-600">{p.unit}</td>
                      <td className="py-4 px-4 font-semibold text-slate-900">{formatCurrency(p.price)}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            p.stock === 0
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            p.active ? 'bg-slate-100 text-slate-700' : 'bg-red-50 text-red-600'
                          }`}
                        >
                          {p.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleOpenStockModal(p)}
                            title="Ajustar estoque"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            title="Editar produto"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar Produto */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cimento CP II 50KG"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unidade *
              </label>
              <input
                type="text"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value.toUpperCase())}
                placeholder="UN, KG, CX, LT"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Preço de Venda (R$) *
              </label>
              <input
                type="text"
                required
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="Ex: 38,50"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Armazenado em centavos</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {editingProduct ? 'Estoque Atual' : 'Estoque Inicial'}
            </label>
            <input
              type="number"
              min="0"
              required
              value={stock}
              onChange={(e) => setStock(parseInt(e.target.value || '0', 10))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {editingProduct && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="activeProd"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="activeProd" className="text-sm font-medium text-slate-700">
                Produto ativo para vendas
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              {saving ? 'Salvando...' : editingProduct ? 'Atualizar Produto' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajuste Rápido de Estoque */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Ajustar Estoque: ${stockProduct?.name || ''}`}
      >
        <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 flex justify-between">
            <span>Estoque Atual:</span>
            <span className="font-bold">
              {stockProduct?.stock} {stockProduct?.unit}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Tipo de Movimentação
            </label>
            <select
              value={stockAdjustmentType}
              onChange={(e: any) => setStockAdjustmentType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ENTRADA">ENTRADA (Adicionar ao estoque)</option>
              <option value="SAIDA">SAÍDA (Baixa manual de estoque)</option>
              <option value="AJUSTE">AJUSTE (Definir quantidade exata)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Quantidade
            </label>
            <input
              type="number"
              min="1"
              required
              value={stockAdjustmentQty}
              onChange={(e) => setStockAdjustmentQty(parseInt(e.target.value || '1', 10))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Motivo do Ajuste *
            </label>
            <input
              type="text"
              required
              value={stockAdjustmentReason}
              onChange={(e) => setStockAdjustmentReason(e.target.value)}
              placeholder="Ex: Chegada de nota fiscal nº 4521 / Contagem física"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsStockModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              {saving ? 'Registrando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
