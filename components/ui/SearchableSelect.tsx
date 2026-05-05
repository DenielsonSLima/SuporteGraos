import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, User } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
  category?: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const SearchableSelect: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = useMemo(() => 
    options.find(opt => opt.id === value),
    [options, value]
  );

  // Sync searchTerm with selection if closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption?.label || '');
    }
  }, [selectedOption, isOpen]);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term || (selectedOption && term === selectedOption.label.toLowerCase() && !isOpen)) return options;
    
    return options.filter(opt => 
      opt.label.toLowerCase().includes(term) || 
      (opt.sublabel?.toLowerCase().includes(term)) ||
      (opt.category?.toLowerCase().includes(term))
    );
  }, [options, searchTerm, isOpen, selectedOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setSearchTerm(option.label);
    setIsOpen(false);
  };

  const inputClass = 'block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:border-slate-800 focus:outline-none transition-all placeholder:text-slate-300 font-bold shadow-sm';

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type="text"
          className={`${inputClass} ${icon ? 'pl-12' : ''} pr-10`}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
            // If user clears the input, clear the selection
            if (!e.target.value) onChange('');
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {searchTerm && (
            <button 
              type="button"
              onClick={() => {
                setSearchTerm('');
                onChange('');
                setIsOpen(true);
              }}
              className="text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
          <ChevronDown 
            className={`text-slate-300 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`} 
            size={18} 
            onClick={() => setIsOpen(!isOpen)}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[110] mt-2 w-full bg-white rounded-2xl shadow-2xl border-2 border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[250px] overflow-y-auto scrollbar-hide">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0 ${value === opt.id ? 'bg-slate-50' : ''}`}
                  onClick={() => handleSelect(opt)}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-black ${value === opt.id ? 'text-slate-900' : 'text-slate-700'}`}>
                      {opt.label}
                    </span>
                    {value === opt.id && (
                       <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                    )}
                  </div>
                  {(opt.sublabel || opt.category) && (
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      {opt.sublabel && <span className="truncate max-w-[150px]">{opt.sublabel}</span>}
                      {opt.sublabel && opt.category && <span>•</span>}
                      {opt.category && <span>{opt.category}</span>}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center bg-slate-50/50">
                <Search size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum parceiro encontrado</p>
                <p className="text-[9px] text-slate-300 font-bold mt-1 uppercase">Verifique a grafia ou cadastre o parceiro</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
