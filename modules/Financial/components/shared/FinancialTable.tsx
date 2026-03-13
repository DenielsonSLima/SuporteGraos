
import React from 'react';

interface FinancialTableProps {
    headers: React.ReactNode[];
    children: React.ReactNode;
}

const FinancialTable: React.FC<FinancialTableProps> = ({ headers, children }) => {
    return (
        <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr className="text-slate-400 font-black uppercase tracking-widest">
                    {headers.map((header, idx) => (
                        <th
                            key={idx}
                            className={`px-4 py-4 first:px-8 last:px-8 ${idx === 0 ? 'w-12 text-center' : ''}`}
                        >
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
                {children}
            </tbody>
        </table>
    );
};

export default FinancialTable;
