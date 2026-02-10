
import React from 'react';
import { SalesOrder } from '../types';
import { Loading } from '../../Loadings/types';
import { settingsService } from '../../../services/settingsService';
import { Sprout } from 'lucide-react';

interface Props {
  order: SalesOrder;
  loadings: Loading[];
}

const SalesOrderTemplate: React.FC<Props> = ({ order, loadings }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const number = (val: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val || 0);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');
  const cleanNotes = (val?: string) => val ? val.replace(/\s*\[ORIGIN:[^\]]+\]\s*/g, ' ').trim() : '';

  // --- CÁLCULOS ---
  const getEffectiveWeightKg = (l: Loading) => (l.unloadWeightKg && l.unloadWeightKg > 0) ? l.unloadWeightKg : l.weightKg;
  const getEffectiveWeightSc = (l: Loading) => getEffectiveWeightKg(l) / 60;

  const contractQtySc = order.quantity || 0;
  const contractQtyKg = contractQtySc * 60;
  const contractTotalValue = order.totalValue;

  const deliveredQtySc = loadings.reduce((acc, l) => acc + getEffectiveWeightSc(l), 0);
  const deliveredQtyKg = loadings.reduce((acc, l) => acc + getEffectiveWeightKg(l), 0);
  const deliveredTotalValue = loadings.reduce((acc, l) => acc + (getEffectiveWeightSc(l) * (l.salesPrice || order.unitPrice || 0)), 0);

  const receipts = order.transactions ? order.transactions.filter(t => t.type === 'receipt') : [];
  const totalReceived = receipts.reduce((acc, t) => acc + t.value, 0);

  const remainingQtySc = Math.max(0, contractQtySc - deliveredQtySc);
  const financialBalance = contractTotalValue - totalReceived;

  return (
    <div id="print-content" className="relative w-full bg-white text-black p-8 text-[10px] leading-tight font-sans">
      
      {/* WATERMARK LAYER - REMOVIDO ROTATE */}
      {watermark.imageUrl ? (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <img 
            src={watermark.imageUrl} 
            alt="Marca D'água" 
            className="w-[80%] object-contain"
            style={{ opacity: watermark.opacity / 100 }}
          />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
           <Sprout size={400} className="text-slate-200 opacity-20" />
        </div>
      )}

      {/* CONTENT LAYER */}
      <div className="relative z-10 flex flex-col h-full min-h-[950px]">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
          <div className="flex gap-4 items-center">
            {/* Logo */}
            <div className="w-20 h-20 bg-white flex items-center justify-center rounded border border-slate-300 overflow-hidden">
               {company.logoUrl ? (
                 <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
               ) : (
                 <Sprout size={32} className="text-slate-400" />
               )}
            </div>
            {/* Company Data */}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wide text-black">{company.razaoSocial}</h1>
              <div className="text-slate-700 space-y-0.5 text-[9px] mt-1 font-medium">
                <p>{company.endereco}, {company.numero} - {company.bairro}</p>
                <p>{company.cidade}/{company.uf} - CEP: {company.cep}</p>
                <p>CNPJ: {company.cnpj} {company.ie && `| IE: ${company.ie}`}</p>
                <p>{company.telefone} | {company.email}</p>
                {company.site && <p>{company.site}</p>}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-xl font-bold text-black">PEDIDO DE VENDA</h2>
            <p className="text-base font-mono font-bold text-emerald-700 mt-1">#{order.number}</p>
            <p className="mt-1 text-black font-medium">Emissão: {date(order.date)}</p>
            <div className="mt-2 inline-block px-2 py-0.5 bg-slate-100 border border-slate-400 rounded text-[9px] font-bold uppercase text-black">
              Status: {order.status === 'approved' ? 'Aprovado' : order.status === 'completed' ? 'Finalizado' : 'Pendente'}
            </div>
          </div>
        </div>

        {/* 1. DADOS DO CLIENTE & COMERCIAL */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-slate-400 rounded p-2">
            <h3 className="font-bold bg-slate-200 px-2 py-1 -mx-2 -mt-2 mb-2 border-b border-slate-400 text-[10px] uppercase text-black">Dados do Cliente</h3>
            <p className="text-black text-[9px]"><span className="font-bold">Razão Social:</span> {order.customerName}</p>
            <p className="text-black text-[9px]"><span className="font-bold">CNPJ/CPF:</span> {order.customerDocument}</p>
            <p className="text-black text-[9px]"><span className="font-bold">Cidade/UF:</span> {order.customerCity}/{order.customerState}</p>
          </div>
          <div className="border border-slate-400 rounded p-2">
            <h3 className="font-bold bg-slate-200 px-2 py-1 -mx-2 -mt-2 mb-2 border-b border-slate-400 text-[10px] uppercase text-black">Comercial</h3>
            <p className="text-black text-[9px]"><span className="font-bold">Vendedor/Sócio:</span> {order.consultantName}</p>
            <p className="text-black text-[9px]"><span className="font-bold">Empresa Vendedora:</span> {company.nomeFantasia}</p>
          </div>
        </div>

        {/* 2. RESUMO DE EXECUÇÃO */}
        <div className="mb-6 border border-slate-400 rounded p-2 bg-slate-50 flex justify-between items-center px-4">
          <div className="text-center">
            <p className="text-[8px] uppercase font-bold text-slate-600">Total Contrato</p>
            <p className="text-sm font-bold text-black">{currency(contractTotalValue)}</p>
            <p className="text-[8px] text-slate-500">{number(contractQtySc)} SC</p>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="text-center">
            <p className="text-[8px] uppercase font-bold text-slate-600">Total Entregue (Destino)</p>
            <p className="text-sm font-bold text-blue-700">{currency(deliveredTotalValue)}</p>
            <p className="text-[8px] text-slate-500">{number(deliveredQtySc)} SC</p>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="text-center">
            <p className="text-[8px] uppercase font-bold text-slate-600">Total Recebido</p>
            <p className="text-sm font-bold text-emerald-700">{currency(totalReceived)}</p>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="text-center">
            <p className="text-[8px] uppercase font-bold text-slate-600">Saldo Financeiro</p>
            <p className="text-sm font-bold text-rose-700">{currency(financialBalance)}</p>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="text-center">
            <p className="text-[8px] uppercase font-bold text-slate-600">Falta Entregar</p>
            <p className="text-sm font-bold text-slate-800">{number(remainingQtySc)} SC</p>
          </div>
        </div>

        {/* 3. PRODUTO */}
        <div className="mb-6">
          <h3 className="font-bold text-[10px] uppercase mb-1 border-b border-black pb-0.5 text-black">Detalhamento do Produto</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-400 text-left">
                <th className="py-1 px-2 font-bold w-1/3 text-black text-[9px]">Produto</th>
                <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Qtd. (SC)</th>
                <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Qtd. (KG)</th>
                <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Valor Unit. (SC)</th>
                <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-white border-b border-slate-300">
                <td className="py-1 px-2 font-medium text-black text-[9px]">{order.productName}</td>
                <td className="py-1 px-2 text-right text-black text-[9px]">{number(contractQtySc)}</td>
                <td className="py-1 px-2 text-right text-black text-[9px]">{number(contractQtyKg)}</td>
                <td className="py-1 px-2 text-right text-black text-[9px]">{order.unitPrice ? currency(order.unitPrice) : '-'}</td>
                <td className="py-1 px-2 text-right font-bold text-black text-[9px]">{currency(order.totalValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. CARREGAMENTOS */}
        <div className="mb-6">
          <h3 className="font-bold text-[10px] uppercase mb-1 border-b border-black pb-0.5 text-black flex justify-between">
            <span>Histórico de Carregamentos (Entregas Realizadas)</span>
            <span>{loadings.length} Cargas</span>
          </h3>
          
          {loadings.length === 0 ? (
            <p className="text-[9px] text-slate-500 italic py-2">Nenhum carregamento registrado.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 text-left">
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Data</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">NF</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Motorista / Placa</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Peso (KG)</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Qtd. (SC)</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Preço (SC)</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Subtotal</th>
                  <th className="py-1 px-2 font-bold text-left text-black text-[9px] w-32">Obs / Anotações</th>
                </tr>
              </thead>
              <tbody>
                {loadings.map((load, idx) => {
                  const effectiveKg = getEffectiveWeightKg(load);
                  const effectiveSc = getEffectiveWeightSc(load);
                  const isConfirmed = load.unloadWeightKg && load.unloadWeightKg > 0;
                  const unitPrice = load.salesPrice || order.unitPrice || 0;

                  return (
                    <tr key={load.id} className="bg-white border-b border-slate-200">
                      <td className="py-1 px-2 text-black font-bold text-[9px]">{date(load.date)}</td>
                      <td className="py-1 px-2 text-black text-[9px] font-mono">{load.invoiceNumber || '-'}</td>
                      <td className="py-1 px-2 text-black text-[9px]">
                        {load.driverName} <span className="text-slate-600">({load.vehiclePlate})</span>
                      </td>
                      <td className={`py-1 px-2 text-right text-black text-[9px] font-medium ${isConfirmed ? '' : 'italic text-slate-500'}`}>
                        {number(effectiveKg)}
                      </td>
                      <td className="py-1 px-2 text-right text-black text-[9px]">{number(effectiveSc)}</td>
                      <td className="py-1 px-2 text-right text-black text-[9px]">{currency(unitPrice)}</td>
                      <td className="py-1 px-2 text-right text-black font-bold text-[9px]">
                        {currency(effectiveSc * unitPrice)}
                      </td>
                      <td className="py-1 px-2 text-[8px] text-slate-600 leading-tight">
                        {load.notes || '-'} 
                        {isConfirmed && load.breakageKg ? ` (Quebra: ${number(load.breakageKg)} kg)` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-bold text-black border-t border-slate-400">
                  <td colSpan={4} className="py-1 px-2 text-right uppercase text-[9px]">Totais Confirmados:</td>
                  <td className="py-1 px-2 text-right text-[9px]">{number(deliveredQtyKg)}</td>
                  <td className="py-1 px-2 text-right text-[9px]">{number(deliveredQtySc)}</td>
                  <td className="py-1 px-2"></td>
                  <td className="py-1 px-2 text-right text-[9px]">{currency(deliveredTotalValue)}</td>
                  <td className="py-1 px-2"></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* 5. RECEBIMENTOS */}
        <div className="mb-6 break-inside-avoid">
          <h3 className="font-bold text-[10px] uppercase mb-1 border-b border-black pb-0.5 text-black">Histórico de Recebimentos</h3>
          
          {receipts.length === 0 ? (
            <p className="text-[9px] text-slate-500 italic py-2">Nenhum recebimento registrado.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 text-left">
                  <th className="py-1 px-2 font-bold text-black w-24 text-[9px]">Data</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Conta de Entrada</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Anotações</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((rec, idx) => (
                  <tr key={rec.id} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="py-1 px-2 text-black text-[9px]">{date(rec.date)}</td>
                    <td className="py-1 px-2 text-black text-[9px]">{rec.accountName}</td>
                    <td className="py-1 px-2 text-black italic text-[9px]">{cleanNotes(rec.notes) || '-'}</td>
                    <td className="py-1 px-2 text-right text-emerald-700 font-bold text-[9px]">{currency(rec.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-black border-t border-slate-400">
                  <td colSpan={3} className="py-1 px-2 text-right uppercase text-[9px]">Total Recebido:</td>
                  <td className="py-1 px-2 text-right text-[9px]">{currency(totalReceived)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* 6. OBSERVAÇÕES FINAIS */}
        <div className="grid grid-cols-1 gap-4 mb-8 break-inside-avoid">
          <div className="border border-slate-400 rounded p-2">
            <h3 className="font-bold bg-slate-200 px-2 py-1 -mx-2 -mt-2 mb-2 border-b border-slate-400 text-[10px] uppercase text-black">Observações Gerais</h3>
            <div className="min-h-[40px] text-justify text-black text-[9px]">
              {order.notes || 'Nenhuma observação adicional registrada.'}
            </div>
          </div>
        </div>

        {/* 7. ASSINATURAS */}
        <div className="mt-auto pt-10 break-inside-avoid">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-t border-black pt-2 mb-1"></div>
              <p className="font-bold text-black text-[10px]">{company.razaoSocial}</p>
              <p className="text-[9px] text-slate-700">Vendedor</p>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-2 mb-1"></div>
              <p className="font-bold text-black text-[10px]">{order.customerName}</p>
              <p className="text-[9px] text-slate-700">Comprador (Cliente)</p>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-300 text-[8px] text-slate-400 flex justify-between items-center">
            <span>Sistema ERP Suporte Grãos - Documento gerado eletronicamente em {new Date().toLocaleString()}</span>
            <span>Página 1 de 1</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SalesOrderTemplate;
