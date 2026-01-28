
import React from 'react';
import ReportLayout from '../../components/ReportLayout';
import { GeneratedReportData } from '../../types';

const Template: React.FC<{ data: GeneratedReportData }> = ({ data }) => {
  return (
    <ReportLayout title={data.title} subtitle={data.subtitle}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 border-b border-slate-300">
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Nome / Razão Social</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Documento</th>
            <th className="py-2 px-2 text-left font-bold uppercase text-slate-700">Localização</th>
            <th className="py-2 px-2 text-center font-bold uppercase text-slate-700">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((partner: any, idx: number) => (
            <tr key={idx} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
              <td className="py-1.5 px-2">{partner.name}</td>
              <td className="py-1.5 px-2 text-center font-mono">{partner.document}</td>
              <td className="py-1.5 px-2">{partner.location}</td>
              <td className="py-1.5 px-2 text-center">{partner.typeLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ReportLayout>
  );
};

export default Template;
