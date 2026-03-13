
import React from 'react';
import { settingsService } from '../../../services/settingsService';
import { Sprout, User, Landmark, MapPin, Phone, Scale, TrendingUp, TrendingDown, Truck, Package } from 'lucide-react';

interface Props {
  data: {
    partner: any;
    purchases: any[];
    sales: any[];
    loadings: any[];
    payables: any[];
    receivables: any[];
    advances: any[];
  };
}

const PartnerDossierTemplate: React.FC<Props> = ({ data }) => {
  const { partner, purchases, sales, loadings, payables, receivables, advances } = data;
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(!val || Math.abs(val) < 0.005 ? 0 : val);
  const dateStr = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // Cálculos Financeiros
  const totalPayable = payables.reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0);
  const totalReceivable = receivables.reduce((acc, r) => acc + (r.originalValue - r.paidValue), 0);
  const netBalance = totalReceivable - totalPayable;

  return (
    <div className="relative w-full bg-white text-slate-900 p-12 text-[9px] leading-tight font-sans min-h-[297mm] flex flex-col box-border overflow-hidden" style={{ width: '800px' }}>

      {/* Marca D'água */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
        {watermark.imageUrl ? (
          <img src={watermark.imageUrl} className="w-[60%] object-contain" alt="BG" />
        ) : (
          <Sprout size={350} className="text-slate-100" />
        )}
      </div>

      <div className="relative z-10 flex-1 flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div className="flex gap-6 items-center">
            <div className="h-16 w-auto flex items-center shrink-0 overflow-hidden">
              {company.logoUrl ? <img src={company.logoUrl} className="max-h-full w-auto object-contain" /> : <Sprout size={40} className="text-emerald-500" />}
            </div>
            <div>
              <h1 className="text-base font-black uppercase text-slate-900 leading-none">{company.razaoSocial}</h1>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Dossiê Analítico 360º de Parceiro</p>
              <div className="text-slate-500 text-[8px] mt-2 space-y-0.5 font-bold uppercase">
                <p>CNPJ: {company.cnpj} | {company.cidade}/{company.uf}</p>
                <p>{company.telefone} | {company.email}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-black text-slate-950 uppercase italic tracking-tighter">RELATÓRIO DE PARCEIRO</h2>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
              #{partner.id.slice(0, 8).toUpperCase()}
            </div>
            <p className="text-[7px] text-slate-400 font-bold uppercase mt-2">Emissão: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* 1. FICHA CADASTRAL */}
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 mb-8">
          <h3 className="font-black uppercase text-[10px] text-slate-900 mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
            <User size={14} className="text-blue-600" /> Identificação Cadastral
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Razão Social / Nome</span>
              <p className="text-sm font-black text-slate-900 uppercase leading-tight">{partner.name}</p>
            </div>
            <div>
              <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Documento Oficial</span>
              <p className="text-sm font-black text-slate-700 font-mono italic">{partner.document}</p>
            </div>
            <div>
              <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Localização</span>
              <p className="text-sm font-black text-slate-700 uppercase">{partner.address?.cityName || 'N/D'} / {partner.address?.stateUf || 'N/D'}</p>
            </div>
          </div>
        </div>

        {/* 2. RESUMO FINANCEIRO CONSOLIDADO */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-black text-emerald-600 uppercase">Créditos / A Receber</span>
              <TrendingUp size={14} className="text-emerald-500" />
            </div>
            <p className="text-xl font-black text-emerald-700">{currency(totalReceivable)}</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[8px] font-black text-rose-600 uppercase">Débitos / A Pagar</span>
              <TrendingDown size={14} className="text-rose-500" />
            </div>
            <p className="text-xl font-black text-rose-700">{currency(totalPayable)}</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl shadow-lg flex flex-col justify-center text-white border-2 border-slate-700">
            <span className="text-[8px] font-black uppercase text-slate-400 mb-1">Saldo Líquido de Acerto</span>
            <p className={`text-xl font-black ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{currency(netBalance)}</p>
          </div>
        </div>

        {/* 3. HISTÓRICO DE CONTRATOS */}
        {(purchases.length > 0 || sales.length > 0) && (
          <div className="mb-8">
            <h3 className="font-black uppercase text-[10px] text-slate-900 mb-3 border-b-2 border-slate-900 pb-1 italic">Histórico de Transações Comerciais</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[8px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 px-3 text-left">Data</th>
                  <th className="py-2 px-3 text-left">Pedido / Ref</th>
                  <th className="py-2 px-3 text-left">Natureza</th>
                  <th className="py-2 px-3 text-right">Volume</th>
                  <th className="py-2 px-3 text-right">Valor Total</th>
                  <th className="py-2 px-3 text-right">V. Liquidado</th>
                </tr>
              </thead>
              <tbody>
                {[...purchases, ...sales].sort((a, b) => b.date.localeCompare(a.date)).map((order, i) => {
                  const isPurchase = 'partnerId' in order;
                  return (
                    <tr key={i} className="border-b border-slate-100 font-bold">
                      <td className="py-2 px-3">{dateStr(order.date)}</td>
                      <td className="py-2 px-3 font-mono">#{order.number}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[7px] uppercase ${isPurchase ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                          {isPurchase ? 'Compra' : 'Venda'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">{order.items?.[0]?.quantity || order.quantity || '-'} SC</td>
                      <td className="py-2 px-3 text-right">{currency(order.totalValue)}</td>
                      <td className="py-2 px-3 text-right text-emerald-700">{currency(order.paidValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. HISTÓRICO DE LOGÍSTICA */}
        {loadings.length > 0 && (
          <div className="mb-8">
            <h3 className="font-black uppercase text-[10px] text-slate-900 mb-3 border-b-2 border-slate-900 pb-1 italic">Movimentações Logísticas (Cargas)</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[8px] font-black uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-2 px-3 text-left">Data</th>
                  <th className="py-2 px-3 text-left">Placa / Motorista</th>
                  <th className="py-2 px-3 text-left">Rota</th>
                  <th className="py-2 px-3 text-right">Peso (Kg)</th>
                  <th className="py-2 px-3 text-right">Custo Frete</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {loadings.slice(0, 15).map((l, i) => (
                  <tr key={i} className="border-b border-slate-50 text-[8px] font-bold">
                    <td className="py-2 px-3">{dateStr(l.date)}</td>
                    <td className="py-2 px-3 uppercase">{l.vehiclePlate} / {l.driverName}</td>
                    <td className="py-2 px-3 uppercase italic truncate max-w-[150px]">{l.supplierName.split(' ')[0]} {'→'} {l.customerName.split(' ')[0]}</td>
                    <td className="py-2 px-3 text-right">{l.weightKg?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{currency(l.totalFreightValue)}</td>
                    <td className="py-2 px-3 text-center uppercase text-[7px] font-black">{l.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Assinaturas */}
        <div className="mt-auto pt-10 border-t-2 border-slate-900 break-inside-avoid">
          <div className="grid grid-cols-2 gap-24 pt-4 text-center">
            <div>
              <div className="border-t border-slate-400 pt-3">
                <p className="font-black text-slate-950 uppercase text-[9px]">{company.razaoSocial}</p>
                <p className="text-[8px] uppercase text-slate-400 font-bold italic">Departamento Financeiro / Auditoria</p>
              </div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-3">
                <p className="font-black text-slate-950 uppercase text-[9px]">{partner.name}</p>
                <p className="text-[8px] uppercase text-slate-400 font-bold italic">Parceiro / Ciência de Saldo</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-4 border-t border-slate-100 flex justify-between items-center text-[7px] font-black text-slate-400 uppercase tracking-widest">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><Sprout size={10} className="text-emerald-500" /> {company.nomeFantasia || 'ERP'} Intelligence</span>
            <span>Documento de Conferência Interna</span>
          </div>
          <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
};

export default PartnerDossierTemplate;
