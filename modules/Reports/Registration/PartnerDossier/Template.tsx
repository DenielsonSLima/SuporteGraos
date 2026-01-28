
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  const dossier = data.rows[0]; // Extract the complex object
  if (!dossier) return null;

  const { partner, purchases, sales, loadings, financial } = dossier;

  const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const date = (val: string) => new Date(val).toLocaleDateString('pt-BR');

  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      
      {/* 1. DADOS CADASTRAIS */}
      <div className="bg-slate-50 border border-slate-300 rounded p-4 mb-6">
        <h3 className="font-bold text-xs uppercase mb-3 text-slate-700 border-b border-slate-300 pb-1">Dados Cadastrais</h3>
        <div className="grid grid-cols-3 gap-4 text-[10px]">
          <div>
            <span className="block font-bold text-slate-500">Razão Social / Nome</span>
            <span className="text-black text-sm">{partner.name}</span>
          </div>
          <div>
            <span className="block font-bold text-slate-500">Documento (CPF/CNPJ)</span>
            <span className="text-black text-sm font-mono">{partner.document}</span>
          </div>
          <div>
            <span className="block font-bold text-slate-500">Tipo</span>
            <span className="text-black text-sm">{partner.type}</span>
          </div>
          <div>
            <span className="block font-bold text-slate-500">Localização</span>
            <span className="text-black">{partner.address?.city} / {partner.address?.state}</span>
          </div>
          <div>
            <span className="block font-bold text-slate-500">Contato</span>
            <span className="text-black">{partner.phone || '-'} {partner.email && `| ${partner.email}`}</span>
          </div>
          <div>
            <span className="block font-bold text-slate-500">Endereço</span>
            <span className="text-black">{partner.address?.street}, {partner.address?.number} - {partner.address?.neighborhood}</span>
          </div>
        </div>
      </div>

      {/* 2. RESUMO FINANCEIRO */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="border border-emerald-200 bg-emerald-50 p-3 rounded">
          <p className="text-[9px] uppercase font-bold text-emerald-800">Créditos / A Receber</p>
          <p className="text-lg font-bold text-emerald-700">{currency(financial.totalToReceive + financial.advancesGiven)}</p>
          <p className="text-[9px] text-emerald-600">Inclui Vendas e Adiant. Concedidos</p>
        </div>
        <div className="border border-rose-200 bg-rose-50 p-3 rounded">
          <p className="text-[9px] uppercase font-bold text-rose-800">Débitos / A Pagar</p>
          <p className="text-lg font-bold text-rose-700">{currency(financial.totalToPay + financial.advancesTaken)}</p>
          <p className="text-[9px] text-rose-600">Inclui Compras, Fretes e Adiant. Recebidos</p>
        </div>
        <div className="border border-slate-300 bg-white p-3 rounded">
          <p className="text-[9px] uppercase font-bold text-slate-600">Saldo Líquido Atual</p>
          <p className={`text-lg font-bold ${financial.netBalance >= 0 ? 'text-black' : 'text-red-600'}`}>
            {currency(financial.netBalance)}
          </p>
          <p className="text-[9px] text-slate-500">{financial.netBalance >= 0 ? 'A favor da empresa' : 'A favor do parceiro'}</p>
        </div>
      </div>

      {/* 3. HISTÓRICO DE COMPRAS */}
      {purchases.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-xs uppercase mb-2 text-black border-b border-black pb-1">Histórico de Compras (Entradas)</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-200">
                <th className="py-1 px-2 text-left text-[9px]">Data</th>
                <th className="py-1 px-2 text-left text-[9px]">Pedido</th>
                <th className="py-1 px-2 text-left text-[9px]">Produto</th>
                <th className="py-1 px-2 text-right text-[9px]">Valor Total</th>
                <th className="py-1 px-2 text-right text-[9px]">Pago</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-200">
                  <td className="py-1 px-2 text-[9px]">{date(p.date)}</td>
                  <td className="py-1 px-2 text-[9px]">{p.number}</td>
                  <td className="py-1 px-2 text-[9px]">{p.items[0]?.productName}</td>
                  <td className="py-1 px-2 text-right text-[9px]">{currency(p.totalValue)}</td>
                  <td className="py-1 px-2 text-right text-[9px] text-emerald-700">{currency(p.paidValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. HISTÓRICO DE VENDAS */}
      {sales.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-xs uppercase mb-2 text-black border-b border-black pb-1">Histórico de Vendas (Saídas)</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-200">
                <th className="py-1 px-2 text-left text-[9px]">Data</th>
                <th className="py-1 px-2 text-left text-[9px]">Pedido</th>
                <th className="py-1 px-2 text-left text-[9px]">Produto</th>
                <th className="py-1 px-2 text-right text-[9px]">Valor Total</th>
                <th className="py-1 px-2 text-right text-[9px]">Recebido</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-200">
                  <td className="py-1 px-2 text-[9px]">{date(s.date)}</td>
                  <td className="py-1 px-2 text-[9px]">{s.number}</td>
                  <td className="py-1 px-2 text-[9px]">{s.productName}</td>
                  <td className="py-1 px-2 text-right text-[9px]">{currency(s.totalValue)}</td>
                  <td className="py-1 px-2 text-right text-[9px] text-emerald-700">{currency(s.paidValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. LOGÍSTICA */}
      {loadings.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-xs uppercase mb-2 text-black border-b border-black pb-1">Movimentações Logísticas</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-200">
                <th className="py-1 px-2 text-left text-[9px]">Data</th>
                <th className="py-1 px-2 text-left text-[9px]">Placa</th>
                <th className="py-1 px-2 text-left text-[9px]">Rota</th>
                <th className="py-1 px-2 text-right text-[9px]">Peso (Kg)</th>
                <th className="py-1 px-2 text-right text-[9px]">Valor Carga</th>
              </tr>
            </thead>
            <tbody>
              {loadings.map((l: any) => (
                <tr key={l.id} className="border-b border-slate-200">
                  <td className="py-1 px-2 text-[9px]">{date(l.date)}</td>
                  <td className="py-1 px-2 text-[9px]">{l.vehiclePlate}</td>
                  <td className="py-1 px-2 text-[9px]">{l.supplierName.split(' ')[0]} {'→'} {l.customerName.split(' ')[0]}</td>
                  <td className="py-1 px-2 text-right text-[9px]">{l.weightKg.toLocaleString()}</td>
                  <td className="py-1 px-2 text-right text-[9px]">{currency(l.totalPurchaseValue || l.totalSalesValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </ReportLayout>
  );
};

export default Template;
