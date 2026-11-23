import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users as ClientsIcon,
  Receipt,
  Clock,
  BarChart3,
  UserCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 min-h-[calc(100vh-4rem)]">
      <nav className="space-y-1">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Principal
        </div>
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard className="w-5 h-5" />
          Dashboard
        </NavLink>
        <NavLink to="/sales/new" className={navLinkClass}>
          <ShoppingCart className="w-5 h-5" />
          Nova Venda
        </NavLink>
        <NavLink to="/sales" className={navLinkClass}>
          <Receipt className="w-5 h-5" />
          Histórico de Vendas
        </NavLink>
        <NavLink to="/payments/pending" className={navLinkClass}>
          <Clock className="w-5 h-5" />
          Pagamentos Pendentes
        </NavLink>

        <div className="pt-4 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Cadastros
        </div>
        <NavLink to="/products" className={navLinkClass}>
          <Package className="w-5 h-5" />
          Produtos
        </NavLink>
        <NavLink to="/clients" className={navLinkClass}>
          <ClientsIcon className="w-5 h-5" />
          Clientes
        </NavLink>

        {isAdmin && (
          <>
            <div className="pt-4 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Administração
            </div>
            <NavLink to="/reports" className={navLinkClass}>
              <BarChart3 className="w-5 h-5" />
              Relatórios
            </NavLink>
            <NavLink to="/users" className={navLinkClass}>
              <UserCheck className="w-5 h-5" />
              Usuários
            </NavLink>
          </>
        )}
      </nav>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
        <p className="font-semibold text-slate-700">Sistema Comercial v1.0</p>
        <p className="mt-0.5">PostgreSQL + NestJS + React</p>
      </div>
    </aside>
  );
};
