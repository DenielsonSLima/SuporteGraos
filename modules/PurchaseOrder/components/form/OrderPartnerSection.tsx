
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Wheat, CheckCircle2, ChevronDown, Map, User } from 'lucide-react';
import { PurchaseOrder } from '../../types';
import { Partner } from '../../../Partners/types';
import { PARTNER_CATEGORY_IDS } from '../../../../constants';
import { locationService } from '../../../../services/locationService';

interface Props {
  data: Partial<PurchaseOrder>;
  partners: Partner[]; 
  onChange: (updates: Partial<PurchaseOrder>) => void;
}

const OrderPartnerSection: React.FC<Props> = ({ data, partners, onChange }) => {
  const [partnerSearchTerm, setPartnerSearchTerm] = useState(data.partnerName || '');
  const [isSearchingPartner, setIsSearchingPartner] = useState(false);
  const partnerSearchRef = useRef<HTMLDivElement>(null);

  const [citySearchTerm, setCitySearchTerm] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const citySearchRef = useRef<HTMLDivElement>(null);
  
  const [availableLocations, setAvailableLocations] = useState<{city: string, state: string}[]>([]);

  useEffect(() => {
    setAvailableLocations(locationService.getAllCitiesFlat());
  }, []);

  // Atualizar citySearchTerm quando o pedido tem cidade de carregamento
  useEffect(() => {
    if (data.loadingCity && data.loadingState && !data.useRegisteredLocation) {
      setCitySearchTerm(`${data.loadingCity}/${data.loadingState}`);
    } else if (data.useRegisteredLocation) {
      setCitySearchTerm('');
    }
  }, [data.loadingCity, data.loadingState, data.useRegisteredLocation]);

  const inputClass = 'block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-slate-900 font-bold focus:border-blue-600 focus:outline-none transition-all';
  const labelClass = 'block text-[10px] font-black text-slate-400 uppercase mb-1.5 tracking-widest ml-1';

  const validPartners = partners
    .filter(p => 
      p.categories.includes(PARTNER_CATEGORY_IDS.RURAL_PRODUCER) || 
      p.categories.includes(PARTNER_CATEGORY_IDS.SUPPLIER)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredPartners = validPartners.filter(p => {
    const searchLower = partnerSearchTerm.toLowerCase();
    return p.name.toLowerCase().includes(searchLower) ||
           p.document.includes(searchLower) ||
           (p.nickname && p.nickname.toLowerCase().includes(searchLower));
  });

  const filteredCities = availableLocations.filter(loc => 
    loc.city.toLowerCase().includes(citySearchTerm.toLowerCase()) ||
    loc.state.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  const handleSelectPartner = (partner: Partner) => {
    const displayName = partner.nickname ? `${partner.name} (${partner.nickname})` : partner.name;
    setPartnerSearchTerm(displayName);
    setIsSearchingPartner(false);
    
    onChange({
      partnerId: partner.id,
      partnerName: partner.name,
      partnerDocument: partner.document,
      partnerCity: partner.address?.city || '',
      partnerState: partner.address?.state || '',
      useRegisteredLocation: true,
      loadingCity: partner.address?.city || '',
      loadingState: partner.address?.state || '',
      harvest: partner.address?.state ? `SAFRA/${partner.address.state} ${new Date().getFullYear()}` : ''
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <h3 className="mb-2 flex items-center gap-2 font-black text-slate-800 uppercase text-xs tracking-tighter">
        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
        2. Fornecedor & Logística
      </h3>

      <div className="relative" ref={partnerSearchRef}>
        <label className={labelClass}>Fornecedor (Produtor / Empresa)</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={partnerSearchTerm}
            onFocus={() => setIsSearchingPartner(true)}
            onChange={(e) => { setPartnerSearchTerm(e.target.value); setIsSearchingPartner(true); }}
            placeholder="Nome ou documento..."
            className={`${inputClass} pl-12`}
          />
          {data.partnerId && !isSearchingPartner && (
             <CheckCircle2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-500" />
          )}
        </div>

        {isSearchingPartner && filteredPartners.length > 0 && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            <ul className="max-h-60 overflow-auto py-2">
              {filteredPartners.map((partner) => (
                <li key={partner.id} onClick={() => handleSelectPartner(partner)} className="cursor-pointer px-5 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 group transition-colors">
                  <div className="font-bold text-slate-900 uppercase">{partner.name}</div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-0.5">
                    <span>{partner.document}</span>
                    <span>{partner.address?.city}/{partner.address?.state}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-slate-50/50 p-6 border-2 border-slate-200 border-dashed">
        <label className="mb-4 block text-[10px] font-black text-slate-500 uppercase tracking-widest">Origem da Mercadoria (Fazenda/Unidade)</label>
        
        <div className="flex flex-col gap-6 mb-6">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${data.useRegisteredLocation ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                {data.useRegisteredLocation && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </div>
            <input type="radio" name="loc" checked={data.useRegisteredLocation} onChange={() => {
              // Ao voltar para endereço cadastrado, restaurar cidade/estado do parceiro
              const partner = partners.find(p => p.id === data.partnerId);
              if (partner?.address) {
                onChange({ 
                  useRegisteredLocation: true,
                  loadingCity: partner.address.city || '',
                  loadingState: partner.address.state || ''
                });
              } else {
                onChange({ useRegisteredLocation: true });
              }
            }} className="hidden" />
            <div className="flex-1">
              <span className="text-sm font-bold text-slate-700 block mb-1">Endereço Cadastrado</span>
              {data.partnerId && partners.find(p => p.id === data.partnerId)?.address ? (
                <div className="text-xs text-slate-500 font-semibold space-y-0.5">
                  <div>{partners.find(p => p.id === data.partnerId)!.address!.street}, {partners.find(p => p.id === data.partnerId)!.address!.number}</div>
                  <div>{partners.find(p => p.id === data.partnerId)!.address!.neighborhood}</div>
                  <div>{partners.find(p => p.id === data.partnerId)!.address!.city} - {partners.find(p => p.id === data.partnerId)!.address!.state}</div>
                  {partners.find(p => p.id === data.partnerId)!.address!.zip && (
                    <div>CEP: {partners.find(p => p.id === data.partnerId)!.address!.zip}</div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 font-semibold italic">Nenhum endereço cadastrado</div>
              )}
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!data.useRegisteredLocation ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                {!data.useRegisteredLocation && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </div>
            <input type="radio" name="loc" checked={!data.useRegisteredLocation} onChange={() => onChange({ useRegisteredLocation: false })} className="hidden" />
            <span className="text-sm font-bold text-slate-700">Retirada em outro local</span>
          </label>
        </div>

        <div ref={citySearchRef} className={`space-y-4 transition-all ${!data.useRegisteredLocation ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
          <div className="relative">
             <Map className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input
                type="text"
                disabled={data.useRegisteredLocation}
                value={citySearchTerm}
                onFocus={() => setIsSearchingCity(true)}
                onChange={(e) => { setCitySearchTerm(e.target.value); setIsSearchingCity(true); }}
                placeholder="Pesquisar cidade..."
                className={`${inputClass} pl-12`}
             />
          </div>

          {isSearchingCity && !data.useRegisteredLocation && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
              <ul className="max-h-40 overflow-auto py-1">
                {filteredCities.map((loc, idx) => (
                  <li key={idx} onClick={() => { setCitySearchTerm(`${loc.city}/${loc.state}`); onChange({ loadingCity: loc.city, loadingState: loc.state }); setIsSearchingCity(false); }} className="cursor-pointer px-5 py-2 hover:bg-slate-50 text-sm font-bold text-slate-700 uppercase">
                    {loc.city} - {loc.state}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className={labelClass}>Complemento (Fazenda, Unidade, Sítio, etc.)</label>
            <input
              type="text"
              disabled={data.useRegisteredLocation}
              value={data.loadingComplement || ''}
              onChange={(e) => onChange({ loadingComplement: e.target.value })}
              placeholder="Ex: Fazenda São João, Unidade 3..."
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderPartnerSection;
