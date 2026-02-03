/**
 * 📸 SnapshotModal - Modal para Finalizar/Congelar Mês
 * 
 * Permite:
 * - Selecionar qual mês finalizar
 * - Adicionar notas opcionais
 * - Confirmação antes de congelar
 * - Sincronização com Supabase
 */

import React, { useState } from 'react';
import { X, Lock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { snapshotService } from '../services/cashier-history';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SnapshotModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() === 0 ? 12 : new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Meses para escolher (12 últimos meses até mês anterior)
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Calcula range de meses disponíveis (últimos 12 meses, exceto o atual)
  const getAvailableMonths = () => {
    const months: { month: number; year: number; label: string }[] = [];
    
    for (let i = 1; i <= 12; i++) {
      let m = currentMonth - i;
      let y = currentYear;
      
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      
      if (m > 0 && m < 13) {
        months.push({
          month: m,
          year: y,
          label: `${monthNames[m - 1]} de ${y}`
        });
      }
    }
    
    return months;
  };

  const availableMonths = getAvailableMonths();

  const handleConfirm = async () => {
    if (!selectedMonth || !selectedYear) return;

    setLoading(true);
    try {
      // Obtém email do usuário (você pode pegar do contexto de autenticação)
      const userEmail = localStorage.getItem('user_email') || 'Usuario';
      
      // Cria snapshot
      snapshotService.createSnapshot(selectedYear, selectedMonth, userEmail, notes || undefined);
      
      setSuccess(true);
      
      // Aguarda um segundo e fecha
      setTimeout(() => {
        setLoading(false);
        onSuccess?.();
        onClose();
        
        // Reset estados
        setSuccess(false);
        setNotes('');
      }, 1500);
    } catch (err) {
      console.error('Erro ao criar snapshot:', err);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedMonthData = availableMonths.find(
    m => m.month === selectedMonth && m.year === selectedYear
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3 text-white">
            <Lock size={24} className="text-amber-400" />
            <div>
              <h3 className="font-black text-lg leading-tight uppercase tracking-tighter italic">
                Finalizar Mês
              </h3>
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">
                Congelar dados para auditoria
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="hover:bg-white/20 p-2 rounded-full transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-slate-300" />
          </button>
        </div>

        {/* Conteúdo */}
        {!success ? (
          <div className="p-6 space-y-5">
            {/* Aviso */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900">Atenção</p>
                <p className="text-xs text-amber-700 mt-1">
                  Um snapshot congelará os dados do mês. Lançamentos posteriores com data do mês anterior serão recalculados automaticamente, mas o snapshot mantém registro de auditoria.
                </p>
              </div>
            </div>

            {/* Seleção de mês */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Qual mês deseja finalizar?
              </label>
              <select
                value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setSelectedYear(parseInt(year));
                  setSelectedMonth(parseInt(month));
                }}
                disabled={loading}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white disabled:opacity-50"
              >
                {availableMonths.map(m => (
                  <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Notas opcionais */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                placeholder="Ex: Fechamento de fim de período, ajustes realizados..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-20 disabled:opacity-50"
              />
            </div>

            {/* Resumo */}
            {selectedMonthData && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-2">Resumo</p>
                <p className="text-sm font-bold text-slate-800">
                  Será congelado: <span className="text-primary-600">{selectedMonthData.label}</span>
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black uppercase text-xs hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || !selectedMonthData}
                className="flex-1 px-6 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-xs hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Finalizando...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Finalizar Mês
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Sucesso */
          <div className="p-6 flex flex-col items-center justify-center gap-4 text-center">
            <div className="bg-emerald-100 p-4 rounded-full">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-lg">Mês Finalizado!</h4>
              <p className="text-sm text-slate-500 mt-2">
                O snapshot foi criado com sucesso e está pronto para auditoria.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SnapshotModal;
