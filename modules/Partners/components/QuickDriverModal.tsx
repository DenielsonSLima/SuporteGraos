import React, { useState } from 'react';
import { X, User, FileBadge, CreditCard, Phone, Save } from 'lucide-react';
import { useCreateDriver } from '../../../hooks/useParceiros';
import { useToast } from '../../../contexts/ToastContext';
import { Driver } from '../types';

interface QuickDriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    partnerId: string;
    onSuccess?: (driver: Driver) => void;
}

const QuickDriverModal: React.FC<QuickDriverModalProps> = ({
    isOpen,
    onClose,
    partnerId,
    onSuccess
}) => {
    const { addToast } = useToast();
    const createDriverMutation = useCreateDriver(partnerId);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState<Partial<Driver>>({
        name: '',
        cpf: '',
        phone: '',
        cnhNumber: '',
        cnhCategory: 'E',
        active: true
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        if (!formData.name) {
            addToast('warning', 'Atenção', 'O nome do motorista é obrigatório.');
            return;
        }

        setIsSubmitting(true);
        try {
            const newDriver = await createDriverMutation.mutateAsync({
                name: formData.name!,
                partnerId,
                cpf: formData.cpf,
                phone: formData.phone,
                cnhNumber: formData.cnhNumber,
                cnhCategory: formData.cnhCategory,
                active: true
            });

            addToast('success', 'Motorista Cadastrado', `${formData.name} foi adicionado com sucesso.`);

            if (onSuccess) {
                onSuccess(newDriver as unknown as Driver);
            }

            onClose();
        } catch (error) {
            addToast('error', 'Erro ao Cadastrar', 'Não foi possível salvar o motorista. Verifique os dados.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputClass = 'w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 font-bold focus:border-primary-500 focus:ring-0 outline-none transition-all placeholder:text-slate-300 text-sm';
    const labelClass = 'block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest ml-1';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                {/* Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-500 rounded-xl shadow-lg shadow-primary-500/20">
                            <User size={20} className="text-white" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tighter italic leading-none">Novo Motorista</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/10 p-1.5 rounded-full transition-colors text-slate-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className={labelClass}>Nome Completo</label>
                        <input
                            autoFocus
                            required
                            className={inputClass}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Digite o nome do motorista"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>CPF</label>
                            <div className="relative">
                                <FileBadge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input
                                    className={`${inputClass} pl-10`}
                                    value={formData.cpf}
                                    onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                    placeholder="000.000.000-00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Telefone</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input
                                    className={`${inputClass} pl-10`}
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className={labelClass}>Nº CNH</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                <input
                                    className={`${inputClass} pl-10`}
                                    value={formData.cnhNumber}
                                    onChange={e => setFormData({ ...formData, cnhNumber: e.target.value })}
                                    placeholder="Número da CNH"
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Cat.</label>
                            <select
                                className={inputClass}
                                value={formData.cnhCategory}
                                onChange={e => setFormData({ ...formData, cnhCategory: e.target.value })}
                            >
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="E">E</option>
                                <option value="AE">AE</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-black uppercase text-xs tracking-widest hover:bg-slate-50 active:scale-95 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 rounded-xl bg-primary-600 text-white font-black shadow-xl shadow-primary-900/20 hover:bg-primary-700 flex items-center justify-center gap-2 uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'Salvando...' : <><Save size={16} /> Salvar</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickDriverModal;
