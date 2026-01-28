
import React from 'react';
import { PurchaseOrder } from '../types';
import { Loading } from '../../Loadings/types';
import { settingsService } from '../../../services/settingsService';
import { Sprout, CheckSquare, Square } from 'lucide-react';

interface Props {
  order: PurchaseOrder;
  loadings: Loading[];
}

const PurchaseOrderTemplate: React.FC<Props> = ({ order, loadings }) => {
  const company = settingsService.getCompanyData();
  const watermark = settingsService.getWatermark();

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  // Filter Transactions
  const payments = order.transactions.filter(t => t.type === 'payment' || t.type === 'advance');
  const expenses = order.transactions.filter(t => t.type === 'expense');

  // Calculations for Summary
  const totalPaid = payments.reduce((acc, t) => acc + t.value, 0);
  const expensesDeducted = expenses.filter(e => e.deductFromPartner).reduce((acc, e) => acc + e.value, 0);
  const effectivePaid = totalPaid + expensesDeducted;
  const balance = order.totalValue - effectivePaid;

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
              <div className="text-slate-800 space-y-0.5 text-[9px] mt-1 font-medium">
                <p>{company.endereco}, {company.numero} - {company.bairro}</p>
                <p>{company.cidade}/{company.uf} - CEP: {company.cep}</p>
                <p>CNPJ: {company.cnpj} {company.ie && `| IE: ${company.ie}`}</p>
                <p>{company.telefone} | {company.email}</p>
                {company.site && <p>{company.site}</p>}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <h2 className="text-xl font-bold text-black">PEDIDO DE COMPRA</h2>
            <p className="text-base font-mono font-bold text-red-700 mt-1">#{order.number}</p>
            <p className="mt-1 text-black font-medium">Emissão: {date(order.date)}</p>
            <div className="mt-2 inline-block px-2 py-0.5 bg-slate-100 border border-slate-400 rounded text-[9px] font-bold uppercase text-black">
              Status: {order.status === 'transport' ? 'Em Trânsito' : order.status === 'completed' ? 'Finalizado' : 'Aprovado'}
            </div>
          </div>
        </div>

        {/* 1. FORNECEDOR & LOGÍSTICA */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-slate-400 rounded p-2">
            <h3 className="font-bold bg-slate-200 px-2 py-1 -mx-2 -mt-2 mb-2 border-b border-slate-400 text-[10px] uppercase text-black">Dados do Fornecedor</h3>
            <p className="text-black text-[9px]"><span className="font-bold">Razão Social:</span> {order.partnerName}</p>
            <p className="text-black text-[9px]"><span className="font-bold">Cidade/UF:</span> {order.partnerCity}/{order.partnerState}</p>
            <p className="text-black text-[9px]"><span className="font-bold">Consultor Resp.:</span> {order.consultantName}</p>
          </div>
          <div className="border border-slate-400 rounded p-2">
            <h3 className="font-bold bg-slate-200 px-2 py-1 -mx-2 -mt-2 mb-2 border-b border-slate-400 text-[10px] uppercase text-black">Logística de Retirada</h3>
            <p className="text-black text-[9px]">
              <span className="font-bold">Local de Carregamento:</span>
              {(() => {
                if (order.useRegisteredLocation) {
                  const city = order.partnerCity || 'N/D';
                  const uf = order.partnerState || 'N/D';
                  return ` ${city} - ${uf}`;
                }
                const city = order.loadingCity || order.partnerCity || 'N/D';
                const uf = order.loadingState || order.partnerState || 'N/D';
                const complement = order.loadingComplement ? ` (${order.loadingComplement})` : '';
                return ` ${city} - ${uf}${complement}`;
              })()}
            </p>
            <p className="text-black text-[9px]"><span className="font-bold">Safra:</span> {order.harvest}</p>
            {order.hasBroker && (
              <p className="mt-1 text-black text-[9px]"><span className="font-bold">Corretor:</span> {order.brokerName}</p>
            )}
          </div>
        </div>

        {/* 2. RESUMO FINANCEIRO (HIGHLIGHTS) */}
        <div className="mb-6 border border-slate-400 rounded p-2 bg-slate-50 flex justify-between items-center px-8">
          <div className="text-center">
            <p className="text-[9px] uppercase font-bold text-slate-600">Total Comprado</p>
            <p className="text-base font-bold text-black">{currency(order.totalValue)}</p>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="text-center">
            <p className="text-[9px] uppercase font-bold text-slate-600">Total Pago/Debitado</p>
            <p className="text-base font-bold text-emerald-700">{currency(effectivePaid)}</p>
          </div>
          <div className="h-6 w-px bg-slate-300"></div>
          <div className="text-center">
            <p className="text-[9px] uppercase font-bold text-slate-600">Saldo Pendente</p>
            <p className="text-base font-bold text-red-700">{currency(balance)}</p>
          </div>
        </div>

        {/* 3. PRODUTOS */}
        <div className="mb-6">
          <h3 className="font-bold text-[10px] uppercase mb-1 border-b border-black pb-0.5 text-black">Detalhamento dos Produtos</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-200 border-b border-slate-400 text-left">
                <th className="py-1 px-2 font-bold w-1/2 text-black text-[9px]">Produto</th>
                <th className="py-1 px-2 font-bold text-center text-black text-[9px]">Unidade</th>
                <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Qtd. Negociada</th>
                <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Valor Unit.</th>
                <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="py-1 px-2 text-black font-medium text-[9px]">{item.productName}</td>
                  <td className="py-1 px-2 text-center text-black text-[9px]">{item.unit}</td>
                  <td className="py-1 px-2 text-right text-black text-[9px]">{item.quantity}</td>
                  <td className="py-1 px-2 text-right text-black text-[9px]">{currency(item.unitPrice)}</td>
                  <td className="py-1 px-2 text-right font-bold text-black text-[9px]">{currency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. CARREGAMENTOS (LOADINGS) */}
        <div className="mb-6">
          <h3 className="font-bold text-[10px] uppercase mb-1 border-b border-black pb-0.5 text-black flex justify-between">
            <span>Histórico de Carregamentos</span>
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
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Preço (SC)</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Qtd. (SC)</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {loadings.map((load, idx) => (
                  <React.Fragment key={load.id}>
                    <tr className="bg-white">
                      <td className="py-1 px-2 text-black font-bold border-t border-slate-300 text-[9px]">{date(load.date)}</td>
                      <td className="py-1 px-2 text-black border-t border-slate-300 text-[9px] font-mono">{load.invoiceNumber || '-'}</td>
                      <td className="py-1 px-2 text-black border-t border-slate-300 text-[9px]">
                        {load.driverName} <span className="text-slate-600">({load.vehiclePlate})</span>
                      </td>
                      <td className="py-1 px-2 text-right text-black border-t border-slate-300 text-[9px]">{load.weightKg.toLocaleString()}</td>
                      <td className="py-1 px-2 text-right text-black border-t border-slate-300 text-[9px]">{currency(load.purchasePricePerSc)}</td>
                      <td className="py-1 px-2 text-right text-black border-t border-slate-300 text-[9px]">{load.weightSc.toFixed(2)}</td>
                      <td className="py-1 px-2 text-right text-black font-bold border-t border-slate-300 text-[9px]">
                        {currency(load.weightSc * (load.purchasePricePerSc || 0))}
                      </td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td colSpan={7} className="py-0.5 px-2 text-[8px] text-slate-600 italic border-b border-slate-300">
                        <span className="font-bold text-black not-italic mr-3">Comprador: {order.consultantName}</span>
                        <span className="font-bold">Anotações:</span> {load.notes || 'Sem anotações.'}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-200 font-bold text-black border-t border-slate-400">
                  <td colSpan={5} className="py-1 px-2 text-right uppercase text-[9px]">Total Carregado:</td>
                  <td className="py-1 px-2 text-right text-[9px]">{loadings.reduce((acc, l) => acc + l.weightSc, 0).toFixed(2)} SC</td>
                  <td className="py-1 px-2 text-right text-[9px]">{currency(loadings.reduce((acc, l) => acc + (l.weightSc * (l.purchasePricePerSc || 0)), 0))}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* 5. FINANCEIRO */}
        <div className="mb-6 break-inside-avoid">
          <h3 className="font-bold text-[10px] uppercase mb-1 border-b border-black pb-0.5 text-black">Pagamentos e Adiantamentos</h3>
          
          {payments.length === 0 ? (
            <p className="text-[9px] text-slate-500 italic py-2">Nenhum pagamento registrado.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 text-left">
                  <th className="py-1 px-2 font-bold text-black w-24 text-[9px]">Data</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Tipo</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Conta Origem</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Observações</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay, idx) => (
                  <tr key={pay.id} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="py-1 px-2 text-black text-[9px]">{date(pay.date)}</td>
                    <td className="py-1 px-2 text-black uppercase text-[8px] font-bold">
                      {pay.type === 'advance' ? 'Adiantamento' : 'Pagamento'}
                    </td>
                    <td className="py-1 px-2 text-black text-[9px]">{pay.accountName}</td>
                    <td className="py-1 px-2 text-black italic text-[9px]">{pay.notes || '-'}</td>
                    <td className="py-1 px-2 text-right text-black font-bold text-[9px]">{currency(pay.value)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold text-black border-t border-slate-400">
                  <td colSpan={4} className="py-1 px-2 text-right uppercase text-[9px]">Subtotal Pago:</td>
                  <td className="py-1 px-2 text-right text-[9px]">{currency(totalPaid)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* 6. DESPESAS EXTRAS */}
        {expenses.length > 0 && (
          <div className="mb-6 break-inside-avoid">
            <h3 className="font-bold text-[10px] uppercase mb-1 border-b border-black pb-0.5 text-black">Despesas Extras</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-slate-400 text-left">
                  <th className="py-1 px-2 font-bold text-black w-24 text-[9px]">Data</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Categoria / Descrição</th>
                  <th className="py-1 px-2 font-bold text-black text-[9px]">Conta</th>
                  <th className="py-1 px-2 font-bold text-center text-black text-[9px]">Debitado do Produtor?</th>
                  <th className="py-1 px-2 font-bold text-right text-black text-[9px]">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, idx) => (
                  <tr key={exp.id} className={`border-b border-slate-300 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="py-1 px-2 text-black text-[9px]">{date(exp.date)}</td>
                    <td className="py-1 px-2 text-black text-[9px]">
                      {exp.notes || 'Despesa Diversa'}
                    </td>
                    <td className="py-1 px-2 text-black text-[9px]">{exp.accountName}</td>
                    <td className="py-1 px-2 text-center text-black flex justify-center">
                      {exp.deductFromPartner ? <CheckSquare size={10} /> : <Square size={10} />}
                    </td>
                    <td className="py-1 px-2 text-right text-rose-700 font-bold text-[9px]">-{currency(exp.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. OBSERVAÇÕES FINAIS */}
        <div className="grid grid-cols-1 gap-4 mb-8 break-inside-avoid">
          <div className="border border-slate-400 rounded p-2">
            <h3 className="font-bold bg-slate-200 px-2 py-1 -mx-2 -mt-2 mb-2 border-b border-slate-400 text-[10px] uppercase text-black">Observações Gerais</h3>
            <div className="min-h-[40px] text-justify text-black text-[9px]">
              {order.notes || 'Nenhuma observação adicional registrada.'}
            </div>
          </div>
        </div>

        {/* 8. ASSINATURAS */}
        <div className="mt-auto pt-10 break-inside-avoid">
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="border-t border-black pt-2 mb-1"></div>
              <p className="font-bold text-black text-[10px]">{company.razaoSocial}</p>
              <p className="text-[9px] text-slate-700">Comprador</p>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-2 mb-1"></div>
              <p className="font-bold text-black text-[10px]">{order.partnerName}</p>
              <p className="text-[9px] text-slate-700">Vendedor (Fornecedor)</p>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-300 text-[8px] text-slate-600 flex justify-between items-center">
            <span>Sistema ERP Suporte Grãos - Documento gerado eletronicamente em {new Date().toLocaleString()}</span>
            <span>Página 1 de 1</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PurchaseOrderTemplate;
