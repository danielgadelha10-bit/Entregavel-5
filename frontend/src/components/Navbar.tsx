import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Briefcase } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          G
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">Gestão Comercial</h1>
          <p className="text-xs text-slate-500">Sistema Integrado de Vendas e Estoque</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3 pr-2 border-r border-slate-200">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800 leading-none">{user.name}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    <Shield className="w-3 h-3" />
                    ADMIN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    <Briefcase className="w-3 h-3" />
                    OPERADOR
                  </span>
                )}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600">
              <UserIcon className="w-5 h-5" />
            </div>
          </div>
        )}

        <button
          onClick={logout}
          title="Sair do sistema"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};
