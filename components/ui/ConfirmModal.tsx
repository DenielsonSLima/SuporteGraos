
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import ModalPortal from './ModalPortal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      iconBg: 'bg-rose-100 text-rose-600',
      confirmBg: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
      detailBg: 'bg-rose-50 border-rose-100 text-rose-700',
      Icon: Trash2,
    },
    warning: {
      iconBg: 'bg-amber-100 text-amber-600',
      confirmBg: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
      detailBg: 'bg-amber-50 border-amber-100 text-amber-700',
      Icon: AlertTriangle,
    },
    info: {
      iconBg: 'bg-blue-100 text-blue-600',
      confirmBg: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
      detailBg: 'bg-blue-50 border-blue-100 text-blue-700',
      Icon: AlertTriangle,
    },
  };

  const config = variantConfig[variant];
  const IconComponent = config.Icon;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4 flex items-start gap-5">
            <div className={`p-4 rounded-2xl ${config.iconBg} shrink-0 shadow-inner`}>
              <IconComponent size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic leading-tight">
                {title}
              </h3>
              <p className="text-sm text-slate-500 font-bold mt-2 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0 -mt-1 -mr-2"
            >
              <X size={20} />
            </button>
          </div>

          {/* Detail */}
          {detail && (
            <div className="px-8 pb-4">
              <div className={`p-4 rounded-2xl border-2 text-xs font-bold ${config.detailBg}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-8 py-3 border-2 border-slate-200 rounded-2xl text-slate-600 font-black uppercase text-xs tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-8 py-3 rounded-2xl text-white font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 ${config.confirmBg}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <IconComponent size={16} />
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default ConfirmModal;
