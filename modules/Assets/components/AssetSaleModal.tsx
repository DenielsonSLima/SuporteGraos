
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, User, Calculator, Save, FileText } from 'lucide-react';
import { Asset } from '../types';
import { partnerService } from '../../../services/partnerService';
import { Partner } from '../../Partners/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  onConfirmSale: (data: any) => void;
}

const AssetSaleModal: React.FC<Props> = ({ isOpen, onClose, asset, onConfirmSale }) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  
  const [buyerId, setBuyerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleValue, setSaleValue] = useState('');
  const [installments, setInstallments] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPartners(partnerService.getAll());
      setSaleValue(asset.acquisitionValue.toString()); // Suggest original value
    }
  }, [isOpen, asset]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const buyer = partners.find(p => p.id === buyerId);
    if (!buyer || !saleValue) return;

    onConfirmSale({
        assetId: asset.id,
        buyerName: buyer.name,
        buyerId: buyer.id,
        saleDate,
        saleValue: parseFloat(saleValue),
        installments,
        firstDueDate,
        notes
    });
    onClose();
  };

  const installmentValue = parseFloat(saleValue) / (installments || 1);

  // Added bg-white text-slate-900 placeholder:text-slate-400
  const inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600';
  const labelClass = 'block text-xs font-bold text-slate-500 uppercase mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        <div className="bg-emerald-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg">Vender Ativo: {asset.name}</h3>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                
                <div>
                    <label className={labelClass}>Comprador</label>
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                           className={`${inputClass} pl-10`}
                           required
                           value={buyerId}
                           onChange={e => setBuyerId(e.target.value)}
                        >
                            <option value="">Selecione o parceiro...</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Data Venda</label>
                        <input type="date" required className={inputClass} value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>Valor Venda (R$)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="number" step="0.01" required 
                                className={`${inputClass} pl-10 font-bold`} 
                                value={saleValue} 
                                onChange={e => setSaleValue(e.target.value)} 
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <h4 className="font-bold text-emerald-800 text-sm mb-3">Condições de Pagamento</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Parcelas</label>
                            <input type="number" min="1" max="60" required className={inputClass} value={installments} onChange={e => setInstallments(parseInt(e.target.value))} />
                        </div>
                        <div>
                            <label className={labelClass}>1º Vencimento</label>
                            <input type="date" required className={inputClass} value={firstDueDate} onChange={e => setFirstDueDate(e.target.value)} />
                        </div>
                    </div>
                    
                    {saleValue && (
                        <div className="mt-3 text-sm text-emerald-700 flex items-center gap-2">
                            <Calculator size={16} />
                            <span>{installments}x de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentValue)}</strong></span>
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelClass}>Observações</label>
                    <textarea rows={2} className={inputClass} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes da negociação..." />
                </div>

                <div className="pt-2 flex justify-end">
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                        <DollarSign size={18} /> Confirmar Venda
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default AssetSaleModal;
