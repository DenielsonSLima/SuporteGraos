
import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'success' | 'warning';
}

import ModalPortal from './ModalPortal';

const ActionConfirmationModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  description,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  type = 'danger'
}) => {
  const [loading, setLoading] = React.useState(false);
  if (!isOpen) return null;

  const handleClose = onClose || onCancel || (() => {});
  const content = description ?? message;

  const getColors = () => {
    switch (type) {
      case 'success': return { icon: 'text-emerald-600', bg: 'bg-emerald-100', btn: 'bg-emerald-600 hover:bg-emerald-700' };
      case 'warning': return { icon: 'text-amber-600', bg: 'bg-amber-100', btn: 'bg-amber-600 hover:bg-amber-700' };
      default: return { icon: 'text-red-600', bg: 'bg-red-100', btn: 'bg-red-600 hover:bg-red-700' };
    }
  };

  const colors = getColors();

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 animate-in fade-in">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 transform transition-all scale-100 border border-slate-100">
          <div className="flex flex-col items-center text-center">
            
            <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${colors.bg} ${colors.icon}`}>
              {type === 'success' ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            
            <div className="text-sm text-slate-500 mb-8 leading-relaxed">
              {content}
            </div>
            
            <div className="flex gap-3 w-full">
              {/* Renderiza o botão cancelar apenas se houver texto definido */}
              {cancelLabel && (
                <button 
                  onClick={handleClose}
                  className="flex-1 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {cancelLabel}
                </button>
              )}
              <button 
                onClick={async () => { 
                  if (loading) return;
                  try {
                    setLoading(true);
                    await onConfirm(); 
                    if (isOpen) handleClose(); 
                  } catch (err) {
                    console.error('Erro ao confirmar ação:', err);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className={`flex-1 px-4 py-3 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 ${colors.btn} ${loading ? 'opacity-50 cursor-not-all' : ''}`}
              >
                {loading ? 'Processando...' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ActionConfirmationModal;
