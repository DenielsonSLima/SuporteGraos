import React from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';

interface SettingsSubPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onBack: () => void;
  children: React.ReactNode;
}

const SettingsSubPage: React.FC<SettingsSubPageProps> = ({
  title,
  description,
  icon: Icon,
  color,
  onBack,
  children
}) => {
  return (
    <div className="animate-in slide-in-from-right-4 duration-300">
      {/* Shared Header for Sub-modules */}
      <div className="mb-6 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="rounded-full bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 text-white shadow-sm ${color}`}>
            <Icon size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
};

export default SettingsSubPage;