
import React from 'react';
import { settingsService } from '../../../services/settingsService';
import { Sprout } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  landscape?: boolean;
  children: React.ReactNode;
}

const ReportLayout: React.FC<Props> = ({ title, subtitle, landscape, children }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  return (
    <div className={`relative w-full bg-white text-slate-950 p-10 text-[9px] leading-tight font-sans ${landscape ? 'min-h-[190mm]' : 'min-h-[297mm]'}`}>
      
      {/* WATERMARK LAYER - CENTRALIZADA E RETA */}
      {watermark.imageUrl ? (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden p-12">
          <img 
            src={watermark.imageUrl} 
            alt="Marca D'água" 
            className="w-[70%] object-contain"
            style={{ opacity: watermark.opacity / 100 }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
           <Sprout size={300} className="text-slate-100 opacity-20" />
        </div>
      )}

      {/* CONTENT LAYER */}
      <div className="relative z-10 flex flex-col h-full">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-950 pb-4 mb-6">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 bg-white flex items-center justify-center rounded border border-slate-200 overflow-hidden">
               {company.logoUrl ? (
                 <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
               ) : (
                 <Sprout size={24} className="text-slate-400" />
               )}
            </div>
            <div>
              <h1 className="text-xs font-black uppercase tracking-tight text-slate-950">{company.razaoSocial}</h1>
              <div className="text-slate-800 text-[8px] space-y-0.5 mt-1 font-bold">
                <p>{company.endereco}, {company.numero} - {company.bairro}</p>
                <p>{company.cidade}/{company.uf} - CNPJ: {company.cnpj}</p>
                <p>{company.telefone} | {company.email}</p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-base font-black text-slate-900 uppercase italic">{title}</h2>
            <p className="text-slate-700 text-[8px] mt-1 font-bold">{subtitle}</p>
            <p className="text-[7px] text-slate-500 mt-0.5 font-bold uppercase">Emitido: {new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        {/* Specific Report Content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Page Footer */}
        <div className="mt-auto border-t border-slate-200 pt-2 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase">
          <span>Sistema ERP Suporte Grãos • Gestão Comercial e Logística</span>
          <span>{company.nomeFantasia}</span>
        </div>

      </div>
    </div>
  );
};

export default ReportLayout;
