
import React from 'react';
import {
  Building2,
  User,
  MapPin,
  Phone,
  Pencil,
  Trash2,
  FileText,
  Truck,
  Briefcase,
  Power,
  Printer,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Partner, PartnerCategory } from '../types';
import { PARTNER_CATEGORY_IDS } from '../../../constants';

interface Props {
  partner: Partner;
  allCategories: PartnerCategory[];
  balance: number; // Saldo consolidado (Positivo = Receber, Negativo = Pagar)
  onEdit: (partner: Partner) => void;
  onDelete: (partner: Partner) => void;
  onViewDetails: (partner: Partner) => void;
  onToggleStatus: (partner: Partner) => void;
  onExportPdf: (partner: Partner) => void;
}

const PartnerCard: React.FC<Props> = ({
  partner,
  allCategories,
  balance,
  onEdit,
  onDelete,
  onViewDetails,
  onToggleStatus,
  onExportPdf
}) => {

  const partnerLabels = partner.categories.map(catId =>
    allCategories.find(c => c.id === catId)?.label || 'Desconhecido'
  );

  const isCarrier = partner.categories.includes(PARTNER_CATEGORY_IDS.CARRIER);
  const isBroker = partner.categories.includes(PARTNER_CATEGORY_IDS.BROKER);
  const hasDedicatedView = isCarrier || isBroker;
  const isActive = partner.active !== false;

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

  const formatDocument = (doc: string) => {
    if (!doc || doc === 'NÃO INFORMADO') return 'Sem documento';
    const cleaned = doc.replace(/\D/g, '');
    if (cleaned.length === 11) return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (cleaned.length === 14) return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return doc;
  };

  const streetLine = [partner.address?.street, partner.address?.number].filter(Boolean).join(', ');
  const cityStateLine = [partner.address?.cityName, partner.address?.stateUf].filter(Boolean).join(' - ');
  const contactLine = partner.phone || partner.email || 'Contato N/D';

  return (
    <div
      className={`
        group relative flex flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl
        ${isActive ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-80'}
      `}
    >
      {/* Clique no Card */}
      <div
        onClick={() => hasDedicatedView ? onViewDetails(partner) : onEdit(partner)}
        className="absolute inset-0 z-0 cursor-pointer"
      />

      {/* Topo: Icone e Badges */}
      <div className="relative z-10 mb-4 flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${partner.type === 'PJ' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} shadow-sm border border-white`}>
          {partner.type === 'PJ' ? <Building2 size={24} /> : <User size={24} />}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border shadow-sm ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {isActive ? 'Ativo' : 'Inativo'}
          </span>
          <div className="flex flex-wrap justify-end gap-1">
            {partnerLabels.slice(0, 2).map((label, index) => (
              <span key={index} className="px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-black uppercase text-slate-500 border border-slate-200">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Identificação */}
      <div className="relative z-10 mb-4 pointer-events-none">
        <h3 className="line-clamp-1 text-lg font-black text-slate-900 uppercase tracking-tight" title={partner.name}>
          {partner.name}
        </h3>
        {partner.nickname && (
          <p className="text-xs text-blue-600 font-extrabold mt-0.5 uppercase tracking-wider">{partner.nickname}</p>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold uppercase tracking-tight">
            <MapPin size={14} className="text-slate-300 shrink-0" />
            <span className="truncate">{streetLine || 'Endereço N/D'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold uppercase tracking-tight">
            <MapPin size={14} className="text-slate-300 shrink-0" />
            <span className="truncate">{cityStateLine || 'Cidade/UF N/D'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold uppercase tracking-tight">
            <Phone size={14} className="text-slate-300 shrink-0" />
            <span className="truncate">{contactLine}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono font-bold">
            <FileText size={14} className="text-slate-300 shrink-0" />
            <span>{formatDocument(partner.document)}</span>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE SALDO */}
      <div className="relative z-10 mb-4 pt-3 border-t border-slate-50">
        {Math.abs(balance) > 0.05 ? (
          <div className={`p-3 rounded-2xl border flex items-center justify-between shadow-sm ${balance > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
            <div className="flex items-center gap-2">
              {balance > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="text-[9px] font-black uppercase tracking-tighter">{balance > 0 ? 'A Receber' : 'A Pagar'}</span>
            </div>
            <span className="text-base font-black tracking-tighter">{currency(Math.abs(balance))}</span>
          </div>
        ) : (
          <div className="p-2 text-center text-[9px] font-black text-slate-300 uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl">
            Saldo Zerado
          </div>
        )}
      </div>

      {/* Ações Específicas */}
      <div className="relative z-10 flex gap-2 mb-4">
        {isCarrier && (
          <div className="flex-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 border border-indigo-100">
            <Truck size={12} /> Frota
          </div>
        )}
        {isBroker && (
          <div className="flex-1 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 border border-violet-100">
            <Briefcase size={12} /> Corretagem
          </div>
        )}
      </div>

      {/* Rodapé de Ações */}
      <div className="relative z-20 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onExportPdf(partner); }}
            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all"
            title="Gerar Dossiê PDF"
          >
            <Printer size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleStatus(partner); }}
            className={`p-2 rounded-xl transition-all ${isActive ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
            title={isActive ? "Inativar" : "Ativar"}
          >
            <Power size={18} />
          </button>
        </div>

        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(partner); }}
            className="p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
            title="Editar"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(partner); }}
            className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            title="Excluir"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerCard;
