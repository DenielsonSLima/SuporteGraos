
import React from 'react';
import { LucideIcon, ChevronRight, FileText } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  color: string; // Espera classes Tailwind (text-*, bg-*, border-*)
}

const ReportCard: React.FC<Props> = ({ title, description, icon: Icon, onClick, color }) => {
  return (
    <button 
      onClick={onClick}
      className="group flex flex-col items-start p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-300 hover:-translate-y-1 transition-all text-left w-full h-full relative overflow-hidden"
    >
      <div className="flex justify-between w-full mb-3">
        <div className={`p-2.5 rounded-lg border ${color}`}>
          <Icon size={22} />
        </div>
        <div className="p-2 rounded-full bg-slate-50 text-slate-300 group-hover:bg-primary-50 group-hover:text-primary-500 transition-colors">
          <ChevronRight size={18} />
        </div>
      </div>
      
      <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-primary-700 transition-colors">
        {title}
      </h3>
      
      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
        {description}
      </p>

      {/* Decorative background icon */}
      <FileText className="absolute -right-4 -bottom-4 text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" size={80} />
    </button>
  );
};

export default ReportCard;
