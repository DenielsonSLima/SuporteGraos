
import React from 'react';
import { GeneratedReportData } from '../types';
import { settingsService } from '../../../services/settingsService';
import { Sprout } from 'lucide-react';

interface Props {
  data: GeneratedReportData;
}

const UniversalReportTemplate: React.FC<Props> = ({ data }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const formatCNPJ = (cnpj: string) => {
    const digits = cnpj.replace(/\D/g, '');
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatValue = (value: any, type?: string) => {
    if (value === undefined || value === null) return '-';
    if (type === 'currency') return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(value) < 0.005 ? 0 : value);
    if (type === 'date') return new Date(value).toLocaleDateString('pt-BR');
    if (type === 'number') return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
    return value;
  };

  return (
    <div className={`relative w-full bg-white text-slate-950 p-6 text-[9px] leading-tight font-sans ${data.landscape ? 'min-h-[190mm]' : 'min-h-[297mm]'}`}>
      
      {/* WATERMARK */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {watermark.imageUrl ? (
          <img 
            src={watermark.imageUrl} 
            alt="Marca D'água" 
            className="max-w-[60%] max-h-[60%] object-contain"
            style={{ opacity: watermark.opacity / 100 }}
          />
        ) : (
          <Sprout size={220} className="text-slate-100 opacity-15" />
        )}
      </div>

      <div className="relative z-10 flex flex-col h-full">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex gap-4 items-start">
            <div className="w-14 h-14 flex items-center justify-center overflow-hidden shrink-0">
               {company.logoUrl ? (
                 <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
               ) : (
                 <Sprout size={24} className="text-slate-400" />
               )}
            </div>
            <div className="flex-1">
              <h1 className="text-xs font-black uppercase tracking-tight text-slate-950 leading-tight">{company.razaoSocial}</h1>
              <p className="text-[8px] text-slate-700 font-bold uppercase mt-0.5">CNPJ: {formatCNPJ(company.cnpj)}</p>
              <p className="text-[8px] text-slate-600 font-medium mt-0.5">{company.endereco}{company.numero ? `, ${company.numero}` : ''}</p>
              <p className="text-[8px] text-slate-600 font-medium">{company.cidade}/{company.uf}{company.cep ? ` - CEP ${company.cep}` : ''}</p>
              <p className="text-[8px] text-slate-600 font-medium mt-0.5">Contato: {company.telefone || '-'}</p>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-base font-black text-slate-950 uppercase italic">{data.title}</h2>
            <p className="text-slate-700 text-[8px] mt-1 font-bold">{data.subtitle}</p>
          </div>
        </div>

        {/* Dynamic Table */}
        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="bg-slate-900 text-white border-b border-slate-900">
              {data.columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`py-2 px-2 font-black uppercase text-[8px] text-${col.align || 'left'} border-x border-slate-700`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={data.columns.length} className="py-12 text-center text-slate-400 font-black uppercase tracking-widest bg-slate-50 italic">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              data.rows.map((row, rIdx) => (
                <tr key={rIdx} className={`border-b border-slate-200 ${rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  {data.columns.map((col, cIdx) => (
                    <td 
                      key={cIdx} 
                      className={`py-1.5 px-2 text-${col.align || 'left'} text-slate-950 font-bold border-x border-slate-100`}
                    >
                      {formatValue(row[col.accessor], col.format)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Summary / Footer Totals */}
        {data.summary && data.summary.length > 0 && (
          <div className="mt-auto mb-8 break-inside-avoid">
            <div className="border-t-2 border-slate-900 pt-3 flex justify-end gap-10">
              {data.summary.map((item, idx) => (
                <div key={idx} className="text-right">
                  <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{item.label}</p>
                  <p className="text-base font-black text-slate-950">{formatValue(item.value, item.format)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto border-t border-slate-200 pt-2 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
          <span>Relatório Automatizado • ERP Suporte Grãos</span>
          <span>{company.nomeFantasia} • {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
};

export default UniversalReportTemplate;
