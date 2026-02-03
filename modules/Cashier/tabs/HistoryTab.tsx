
import React, { useState } from 'react';
import { Plus, Lock } from 'lucide-react';
import HistoryViewComponent from '../components/HistoryViewComponent';
import SnapshotModal from '../components/SnapshotModal';

const HistoryTab: React.FC = () => {
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header com botão de novo snapshot */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Histórico de Meses Anteriores</h2>
          <p className="text-slate-500 text-sm mt-1">
            Visualize os fechamentos de caixa dos meses anteriores. Você pode congelar um mês manualmente para auditoria.
          </p>
        </div>
        <button
          onClick={() => setIsSnapshotModalOpen(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
        >
          <Lock size={16} />
          Finalizar Mês
        </button>
      </div>

      {/* Componente principal de histórico */}
      <HistoryViewComponent onCloseDetail={() => {}} />

      {/* Modal de snapshot */}
      <SnapshotModal 
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        onSuccess={() => {
          setIsSnapshotModalOpen(false);
          // Força recalculação do histórico
          window.dispatchEvent(new Event('cashier:updated'));
        }}
      />
    </div>
  );
};

export default HistoryTab;

