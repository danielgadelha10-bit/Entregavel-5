import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { User, Role } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, extractApiErrorMessage } from '../utils/formatters';
import { Shield, Briefcase, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user: currentUser, updateCurrentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      console.error(err);
      setError(extractApiErrorMessage(err, 'Erro ao carregar usuários cadastrados'));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setError(null);
    setSuccessMsg(null);

    try {
      await api.patch(`/users/${userId}`, { role: newRole });
      if (userId === currentUser?.id && newRole !== currentUser.role) {
        updateCurrentUser({ role: newRole });
        return;
      }
      setSuccessMsg('Perfil de acesso atualizado com sucesso!');
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(extractApiErrorMessage(err, 'Falha ao alterar perfil de acesso'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Usuários e Perfis</h1>
        <p className="text-sm text-slate-500">
          Controle de permissões (ADMIN e OPERADOR) com proteção de regras de segurança
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Regra de Perfis em Destaque */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600 space-y-2">
        <p className="font-bold text-slate-800 text-sm">Regras de Acesso e Perfis:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100">
            <span className="font-bold text-purple-700 flex items-center gap-1 mb-1">
              <Shield className="w-4 h-4" /> Perfil ADMIN:
            </span>
            <span>
              Acesso total: Gerencia produtos, clientes e usuários. Consulta todas as vendas e gera relatórios. O primeiro usuário cadastrado é automaticamente ADMIN.
            </span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
            <span className="font-bold text-blue-700 flex items-center gap-1 mb-1">
              <Briefcase className="w-4 h-4" /> Perfil OPERADOR:
            </span>
            <span>
              Acesso operacional: Consulta produtos e clientes, registra vendas e visualiza suas próprias vendas emitidas. Demais usuários recebem esse perfil.
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Carregando usuários...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Usuário</th>
                  <th className="py-3.5 px-4">E-mail</th>
                  <th className="py-3.5 px-4">Cadastro em</th>
                  <th className="py-3.5 px-4">Vendas Emitidas</th>
                  <th className="py-3.5 px-4">Perfil Atual</th>
                  <th className="py-3.5 px-6 text-right">Alterar Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {u.name} {isCurrent && <span className="text-xs text-blue-600 font-normal">(Você)</span>}
                      </td>
                      <td className="py-4 px-4 text-slate-600">{u.email}</td>
                      <td className="py-4 px-4 text-xs text-slate-500">{formatDateTime(u.createdAt)}</td>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {u._count?.sales ?? 0} venda(s)
                      </td>
                      <td className="py-4 px-4">
                        {u.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                            <Shield className="w-3 h-3" />
                            ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            <Briefcase className="w-3 h-3" />
                            OPERADOR
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className="px-2.5 py-1 text-xs font-medium border border-slate-300 rounded-lg outline-none bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="OPERADOR">OPERADOR</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
