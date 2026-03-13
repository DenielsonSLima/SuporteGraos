
import React from 'react';
import {
    ArrowRight, CheckCircle2, AlertTriangle, Info,
    ShieldCheck, Zap
} from 'lucide-react';

export const currency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(val) < 0.005 ? 0 : val);

export const SectionTitle = ({ title, icon: Icon }: { title: string, icon?: any }) => (
    <div className="mb-8 border-b-4 border-slate-100 pb-4">
        <div className="flex items-center gap-3 mb-2">
            {Icon && <Icon className="text-primary-600" size={24} />}
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{title}</h2>
        </div>
        <div className="h-1.5 w-20 bg-primary-500 rounded-full"></div>
    </div>
);

export const StepBox = ({ title, steps }: { title: string, steps: string[] }) => (
    <div className="bg-slate-50 rounded-3xl border border-slate-200 p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 text-slate-900"><Zap size={64} /></div>
        <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500"></div>
            {title}
        </h3>
        <div className="space-y-4">
            {steps.map((s, i) => (
                <div key={i} className="flex gap-4 items-start group">
                    <div className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
                        {i + 1}
                    </div>
                    <p className="text-sm font-bold text-slate-600 leading-relaxed">{s}</p>
                </div>
            ))}
        </div>
    </div>
);

export const GoldenRule = ({ text }: { text: string }) => (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-xl">
        <div className="flex items-center gap-2 text-amber-800 font-black text-[10px] uppercase mb-1">
            <ShieldCheck size={14} /> Regra de Ouro
        </div>
        <p className="text-sm text-amber-900 font-medium italic">"{text}"</p>
    </div>
);

export const SubModule = ({ name, desc }: { name: string, desc: string }) => (
    <div className="border-l-4 border-slate-200 pl-6 py-4 mb-6 hover:border-primary-500 transition-colors bg-white hover:bg-slate-50 rounded-r-xl group">
        <h4 className="font-black text-slate-800 uppercase text-xs mb-1 group-hover:text-primary-700 transition-colors">{name}</h4>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
);

export const ExampleBox = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 text-blue-800 font-black text-[10px] uppercase mb-3">
            <Info size={14} /> {title}
        </div>
        <div className="text-sm text-blue-900 font-medium leading-relaxed space-y-1">{children}</div>
    </div>
);

export const WarningBox = ({ text }: { text: string }) => (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
        <div className="flex items-center gap-2 text-red-800 font-black text-[10px] uppercase mb-1">
            <AlertTriangle size={14} /> Atenção
        </div>
        <p className="text-sm text-red-900 font-medium">{text}</p>
    </div>
);

export const InfoBox = ({ text }: { text: string }) => (
    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6 rounded-r-xl">
        <div className="flex items-center gap-2 text-emerald-800 font-black text-[10px] uppercase mb-1">
            <CheckCircle2 size={14} /> Dica
        </div>
        <p className="text-sm text-emerald-900 font-medium">{text}</p>
    </div>
);

export const FieldTable = ({ fields }: { fields: { campo: string, tipo: string, obs: string }[] }) => (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
            <thead className="bg-slate-100">
                <tr>
                    <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-wider text-slate-500">Campo</th>
                    <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-wider text-slate-500">Tipo</th>
                    <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-wider text-slate-500">Observação</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {fields.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-700">{f.campo}</td>
                        <td className="px-4 py-3 text-slate-500">{f.tipo}</td>
                        <td className="px-4 py-3 text-slate-500">{f.obs}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export const StatusFlow = ({ statuses }: { statuses: string[] }) => (
    <div className="flex items-center gap-2 flex-wrap mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
        {statuses.map((s, i) => (
            <React.Fragment key={i}>
                <span className="px-3 py-1.5 bg-white rounded-lg text-xs font-black text-slate-700 border border-slate-200 shadow-sm">{s}</span>
                {i < statuses.length - 1 && <ArrowRight size={14} className="text-slate-400" />}
            </React.Fragment>
        ))}
    </div>
);
