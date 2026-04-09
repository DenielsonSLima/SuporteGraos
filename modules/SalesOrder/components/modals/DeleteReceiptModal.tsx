import React from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import ModalPortal from '../../../../components/ui/ModalPortal';
import { formatCurrency } from '../../../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  receiptData?: {
    date: string;
    amount: number;
    accountName: string;
  };
}

const DeleteReceiptModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, receiptData }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('[DeleteReceiptModal] Erro ao excluir:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-red-100">
          <div className="px-6 py-4 flex justify-between items-center text-white bg-red-600">
            <h3 className="font-black text-lg flex items-center gap-2 uppercase italic tracking-tighter">
              <AlertTriangle size={20} />
              Estornar Recebimento
            </h3>
            <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                <Trash2 size={32} />
              </div>
              <h4 className="text-xl font-black text-slate-800">Você tem certeza?</h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Esta ação irá **estornar** o recebimento do pedido e remover o lançamento da conta bancária. O saldo do pedido será restaurado.
              </p>
            </div>

            {receiptData && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest">Valor</span>
                  <span className="font-black text-red-600">{formatCurrency(receiptData.amount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest">Data</span>
                  <span className="font-black text-slate-700">{new Date(receiptData.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-widest">Conta</span>
                  <span className="font-black text-slate-700">{receiptData.accountName}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-4 rounded-2xl bg-red-600 text-white font-black uppercase text-xs shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Estornar Agora'}
              </button>
              <button 
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase text-xs hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default DeleteReceiptModal;
