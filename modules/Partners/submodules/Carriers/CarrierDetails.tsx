
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Truck, 
  User, 
  Plus, 
  Trash2, 
  Pencil, 
  Link as LinkIcon, 
  X,
  CreditCard,
  FileBadge,
  Unplug,
  Power
} from 'lucide-react';
import { Partner, Driver, Vehicle } from '../../types';
import { fleetService } from '../../../../services/fleetService';
import { driverService } from '../../../../services/driverService';
import { vehicleService } from '../../../../services/vehicleService';
import { useToast } from '../../../../contexts/ToastContext';

interface Props {
  carrier: Partner;
  onBack: () => void;
}

const CarrierDetails: React.FC<Props> = ({ carrier, onBack }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles' | 'sets'>('drivers');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'driver' | 'vehicle'>('driver');
  const [editingId, setEditingId] = useState<string | null>(null);

  // --- Data States (Initialized Empty) ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  // --- Load Data Effect ---
  useEffect(() => {
    // Subscribe to driver changes
    const unsubscribeDrivers = driverService.subscribe(items => {
      setDrivers(items.filter(d => d.partner_id === carrier.id));
    });

    // Subscribe to vehicle changes
    const unsubscribeVehicles = vehicleService.subscribe(items => {
      setVehicles(items.filter(v => v.owner_type === 'own' && v.owner_transporter_id === carrier.id));
    });

    // Load initial data
    loadData();

    // Cleanup subscriptions
    return () => {
      unsubscribeDrivers();
      unsubscribeVehicles();
    };
  }, [carrier.id]);

  const loadData = () => {
    // Carrega motoristas e veículos vinculados a este parceiro
    setDrivers(driverService.getByPartner(carrier.id) as any);
    setVehicles(vehicleService.getByOwnerPartner(carrier.id) as any);
  };

  // --- Form States ---
  const [driverForm, setDriverForm] = useState<Partial<Driver>>({});
  const [vehicleForm, setVehicleForm] = useState<Partial<Vehicle>>({});

  // --- Actions ---

  const handleAddDriver = () => {
    setDriverForm({ active: true }); // Padrão ativo
    setEditingId(null);
    setModalType('driver');
    setShowModal(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setDriverForm(driver);
    setEditingId(driver.id);
    setModalType('driver');
    setShowModal(true);
  };

  const handleAddVehicle = () => {
    setVehicleForm({ type: 'truck' }); // default
    setEditingId(null);
    setModalType('vehicle');
    setShowModal(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setVehicleForm(vehicle);
    setEditingId(vehicle.id);
    setModalType('vehicle');
    setShowModal(true);
  };

  const toggleDriverStatus = async (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    if (driver) {
      try {
        await driverService.update({ ...driver, active: !driver.active } as any);
        loadData();
      } catch (error) {
        console.error('Erro ao alterar status:', error);
        addToast('error', 'Erro', 'Não foi possível alterar o status.');
      }
    }
  };

  const saveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driverForm.name) {
        addToast('warning', 'Atenção', 'Nome é obrigatório.');
        return;
    }

    try {
      if (editingId) {
        // ATUALIZAR EXISTENTE
        const existing = driverService.getById(editingId);
        if (existing) {
          await driverService.update({ 
            ...existing, 
            ...driverForm,
            name: driverForm.name!,
            document: driverForm.document || 'NÃO INFORMADO',
            license_number: driverForm.license_number || 'NÃO INFORMADO'
          } as any);
          addToast('success', 'Motorista Atualizado');
        }
      } else {
        // CRIAR NOVO vinculado ao parceiro
        await driverService.add({
          name: driverForm.name!,
          document: driverForm.document || 'NÃO INFORMADO',
          license_number: driverForm.license_number || 'NÃO INFORMADO',
          partner_id: carrier.id, // Vincula automaticamente ao parceiro
          phone: driverForm.phone,
          email: driverForm.email,
          birth_date: driverForm.birth_date,
          address: driverForm.address,
          active: true
        });
        addToast('success', 'Motorista Cadastrado e Vinculado');
      }
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar motorista:', error);
      addToast('error', 'Erro ao Salvar', 'Verifique os dados e tente novamente.');
    }
  };

  const saveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleForm.plate || !vehicleForm.type) {
        addToast('warning', 'Atenção', 'Placa e tipo são obrigatórios.');
        return;
    }

    try {
      if (editingId) {
        const existing = vehicleService.getById(editingId);
        if (existing) {
          await vehicleService.update({ 
            ...existing, 
            ...vehicleForm,
            plate: vehicleForm.plate!,
            type: vehicleForm.type as any
          } as any);
          addToast('success', 'Veículo Atualizado');
        }
      } else {
        // CRIAR NOVO vinculado ao parceiro
        await vehicleService.add({
          plate: vehicleForm.plate!,
          type: (vehicleForm.type || 'truck') as any,
          owner_type: 'third_party',
          owner_partner_id: carrier.id, // Vincula automaticamente ao parceiro
          model: vehicleForm.model,
          year: vehicleForm.year,
          color: vehicleForm.color,
          capacity_kg: vehicleForm.capacity_kg,
          active: true
        });
        addToast('success', 'Veículo Cadastrado e Vinculado');
      }
      loadData();
      setShowModal(false);
    } catch (error) {
      console.error('Erro ao salvar veículo:', error);
      addToast('error', 'Erro ao Salvar', 'Verifique os dados e tente novamente.');
    }
  };

  const deleteItem = async (type: 'driver' | 'vehicle', id: string) => {
    if (window.confirm('Deseja remover este item permanentemente?')) {
      try {
        if (type === 'driver') {
          await driverService.delete(id);
          addToast('success', 'Motorista Excluído');
        } else {
          await vehicleService.delete(id);
          addToast('success', 'Veículo Excluído');
        }
        loadData();
      } catch (error) {
        console.error('Erro ao excluir:', error);
        addToast('error', 'Erro ao Excluir', 'Não foi possível remover o item.');
      }
    }
  };

  const unlinkDriver = (driverId: string) => {
    if(window.confirm('Deseja remover o vínculo entre este motorista e o veículo?')) {
      const driver = drivers.find(d => d.id === driverId);
      if (driver) {
        fleetService.updateDriver({ ...driver, linkedVehicleId: undefined });
        loadData();
        addToast('success', 'Vínculo Removido');
      }
    }
  };

  // --- Derived Data for "Conjuntos" Tab ---
  // MOSTRAR TODOS OS ATIVOS, independente de terem veículo ou não
  const activeSets = drivers
    .filter(d => d.active)
    .map(driver => {
      const vehicle = vehicles.find(v => v.id === driver.linkedVehicleId);
      return { driver, vehicle };
    });

  // Common Input Class
  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="animate-in slide-in-from-right-4 duration-300">
      
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button 
          onClick={onBack}
          className="rounded-full bg-white p-2 text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{carrier.tradeName || carrier.name}</h2>
          <p className="text-sm text-slate-500">Gestão de Frota e Motoristas</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm min-h-[600px] flex flex-col">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'drivers' 
                ? 'border-primary-500 text-primary-600 bg-primary-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={18} />
            Motoristas
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'vehicles' 
                ? 'border-primary-500 text-primary-600 bg-primary-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck size={18} />
            Veículos
          </button>
          <button
            onClick={() => setActiveTab('sets')}
            className={`flex-1 py-4 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'sets' 
                ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <LinkIcon size={18} />
            Conjuntos ({activeSets.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 bg-slate-50/50">
          
          {/* DRIVERS TAB */}
          {activeTab === 'drivers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <p className="text-sm text-slate-500">
                   Cadastre motoristas. O vínculo com o veículo é opcional.
                 </p>
                <button 
                  onClick={handleAddDriver}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  <Plus size={16} />
                  Adicionar Motorista
                </button>
              </div>

              {drivers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                  Nenhum motorista cadastrado para esta transportadora.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {drivers.map(driver => (
                    <div 
                      key={driver.id} 
                      className={`
                        bg-white p-4 rounded-lg border shadow-sm flex flex-col gap-2 relative group transition-all
                        ${driver.active ? 'border-slate-200' : 'border-slate-100 opacity-75 bg-slate-50'}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold ${driver.active ? 'text-slate-800' : 'text-slate-500'}`}>
                            {driver.name}
                          </h4>
                          {!driver.active && (
                            <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Inativo</span>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          <button 
                            onClick={() => toggleDriverStatus(driver.id)}
                            className={`p-1 rounded transition-colors ${
                              driver.active 
                                ? 'text-emerald-500 hover:bg-emerald-50' 
                                : 'text-slate-400 hover:bg-slate-200'
                            }`}
                            title={driver.active ? "Desativar Motorista" : "Ativar Motorista"}
                          >
                            <Power size={16} />
                          </button>

                          <button 
                            onClick={() => handleEditDriver(driver)} 
                            className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Editar Motorista"
                          >
                            <Pencil size={16}/>
                          </button>
                          <button 
                            onClick={() => deleteItem('driver', driver.id)} 
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Excluir Motorista"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p className="flex items-center gap-2"><FileBadge size={14}/> CPF: {driver.cpf || '-'}</p>
                        <p className="flex items-center gap-2"><CreditCard size={14}/> CNH: {driver.cnh || '-'} ({driver.cnhCategory})</p>
                        <p className="text-slate-500">{driver.phone || '-'}</p>
                      </div>
                      
                      {/* Link Status */}
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        {driver.linkedVehicleId ? (
                          <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded ${driver.active ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 bg-slate-100'}`}>
                            <LinkIcon size={12} />
                            Vinculado: {vehicles.find(v => v.id === driver.linkedVehicleId)?.plate || 'Veículo Desconhecido'}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic flex items-center gap-2 px-2 py-1">
                            <Unplug size={12} />
                            Sem veículo vinculado
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">
                   Cadastre a frota disponível da transportadora.
                 </p>
                <button 
                  onClick={handleAddVehicle}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  <Plus size={16} />
                  Adicionar Veículo
                </button>
              </div>

              {vehicles.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                  Nenhum veículo cadastrado.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles.map(vehicle => (
                    <div key={vehicle.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg">{vehicle.plate}</h4>
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{vehicle.type}</span>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleEditVehicle(vehicle)} 
                            className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Editar Veículo"
                          >
                            <Pencil size={16}/>
                          </button>
                          <button 
                            onClick={() => deleteItem('vehicle', vehicle.id)} 
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Excluir Veículo"
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{vehicle.model}</p>
                      <div className="text-xs text-slate-500 space-y-1 mt-1 pt-2 border-t border-slate-100">
                        {(vehicle.trailerPlate1 || vehicle.trailerPlate2) && (
                          <p>Carretas: {vehicle.trailerPlate1} {vehicle.trailerPlate2 ? `/ ${vehicle.trailerPlate2}` : ''}</p>
                        )}
                        {vehicle.antt && <p>ANTT: {vehicle.antt}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONJUNTOS (SETS) TAB - AUTOMATIC */}
          {activeTab === 'sets' && (
             <div className="space-y-4">
               <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-800 flex items-center gap-3">
                 <LinkIcon size={20} />
                 <div>
                   <p className="font-bold">Gerenciamento de Conjuntos</p>
                   <p>Visualize todos os motoristas ativos. Utilize os botões para criar ou remover vínculos com veículos.</p>
                 </div>
               </div>

               {activeSets.length === 0 ? (
                 <div className="text-center py-10 text-slate-500">
                   Nenhum motorista ativo encontrado. Ative ou cadastre um motorista para gerenciar conjuntos.
                 </div>
               ) : (
                 <div className="grid gap-4 md:grid-cols-2">
                   {activeSets.map((set) => (
                     <div key={set.driver.id} className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                       
                       {/* Driver Side */}
                       <div className="flex items-center gap-4 flex-1">
                         <div className="flex flex-col items-center gap-1">
                           <div className="p-2 rounded-full bg-slate-100 text-slate-600"><User size={20} /></div>
                           <span className="text-xs font-bold text-slate-500">Motorista</span>
                         </div>
                         <div>
                           <h4 className="font-bold text-slate-800">{set.driver.name}</h4>
                           <p className="text-xs text-slate-500">{set.driver.phone || 'Sem telefone'}</p>
                         </div>
                       </div>

                       {/* Connection Visual */}
                       <div className="flex flex-col items-center px-4">
                         {set.vehicle ? (
                           <>
                             <LinkIcon size={16} className="text-indigo-400" />
                             <div className="h-8 w-0.5 my-1 bg-indigo-100"></div>
                           </>
                         ) : (
                           <>
                             <Unplug size={16} className="text-slate-300" />
                             <div className="h-8 w-0.5 my-1 bg-slate-100"></div>
                           </>
                         )}
                       </div>

                       {/* Vehicle Side */}
                       <div className="flex items-center gap-4 text-right flex-1 justify-end">
                         {set.vehicle ? (
                           <>
                             <div>
                               <h4 className="font-bold text-slate-800">{set.vehicle.plate}</h4>
                               <p className="text-xs text-slate-500">{set.vehicle.model}</p>
                             </div>
                             <div className="flex flex-col items-center gap-1">
                               <div className="bg-slate-100 p-2 rounded-full text-slate-600"><Truck size={20} /></div>
                               <span className="text-xs font-bold text-slate-500">Veículo</span>
                             </div>
                           </>
                         ) : (
                           <div className="flex items-center gap-2 text-slate-400 italic">
                             <span className="text-sm">Sem Veículo</span>
                             <div className="bg-slate-50 p-2 rounded-full text-slate-300"><Truck size={20} /></div>
                           </div>
                         )}
                       </div>

                       {/* Actions */}
                       <div className="ml-4 pl-4 border-l border-slate-100">
                         {set.vehicle ? (
                           <button 
                             onClick={() => unlinkDriver(set.driver.id)}
                             className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                             title="Desvincular Conjunto"
                           >
                             <Unplug size={20} />
                           </button>
                         ) : (
                           <button 
                             onClick={() => handleEditDriver(set.driver)}
                             className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                             title="Vincular Veículo"
                           >
                             <LinkIcon size={20} />
                           </button>
                         )}
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">
                {modalType === 'driver' 
                  ? (editingId ? 'Editar Motorista' : 'Novo Motorista') 
                  : (editingId ? 'Editar Veículo' : 'Novo Veículo')}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <form onSubmit={modalType === 'driver' ? saveDriver : saveVehicle} className="p-6 space-y-4">
              
              {modalType === 'driver' ? (
                <>
                  <div className="flex items-center justify-between">
                     <label className={labelClass}>Nome Completo</label>
                     <div className="flex items-center gap-2">
                       <span className="text-xs text-slate-500">Status:</span>
                       <button
                         type="button"
                         onClick={() => setDriverForm({...driverForm, active: !driverForm.active})}
                         className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${driverForm.active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                       >
                         <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${driverForm.active ? 'translate-x-5' : 'translate-x-1'}`} />
                       </button>
                       <span className="text-xs font-medium text-slate-700">{driverForm.active ? 'Ativo' : 'Inativo'}</span>
                     </div>
                  </div>
                  <input required className={inputClass} value={driverForm.name || ''} onChange={e => setDriverForm({...driverForm, name: e.target.value})} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className={labelClass}>CPF</label>
                       {/* REMOVED REQUIRED */}
                       <input className={inputClass} value={driverForm.cpf || ''} onChange={e => setDriverForm({...driverForm, cpf: e.target.value})} />
                    </div>
                    <div>
                       <label className={labelClass}>Telefone</label>
                       <input className={inputClass} value={driverForm.phone || ''} onChange={e => setDriverForm({...driverForm, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                       <label className={labelClass}>Nº CNH</label>
                       {/* REMOVED REQUIRED */}
                       <input className={inputClass} value={driverForm.cnh || ''} onChange={e => setDriverForm({...driverForm, cnh: e.target.value})} />
                    </div>
                    <div>
                       <label className={labelClass}>Cat.</label>
                       <select className={inputClass} value={driverForm.cnhCategory || 'E'} onChange={e => setDriverForm({...driverForm, cnhCategory: e.target.value})}>
                         <option value="C">C</option>
                         <option value="D">D</option>
                         <option value="E">E</option>
                         <option value="AE">AE</option>
                       </select>
                    </div>
                  </div>
                  
                  {/* Vehicle Link Section */}
                  <div className="pt-2 border-t border-slate-100 mt-2">
                    <label className={labelClass}>Vincular a Veículo (Opcional)</label>
                    <select 
                      className={inputClass}
                      value={driverForm.linkedVehicleId || ''} 
                      onChange={e => setDriverForm({...driverForm, linkedVehicleId: e.target.value})}
                    >
                      <option value="">Sem vínculo (apenas motorista)</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.plate} - {v.model}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Ao selecionar um veículo, um "Conjunto" será criado automaticamente.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Placa (Cavalo)</label>
                      <input required className={`${inputClass} uppercase`} value={vehicleForm.plate || ''} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelClass}>Tipo</label>
                      <select className={inputClass} value={vehicleForm.type} onChange={e => setVehicleForm({...vehicleForm, type: e.target.value as any})}>
                        <option value="truck">Truck</option>
                        <option value="bitruck">Bitruck</option>
                        <option value="carreta_ls">Carreta LS</option>
                        <option value="vanderleia">Vanderleia</option>
                        <option value="bi_trem">Bi-trem</option>
                        <option value="rodotrem">Rodotrem</option>
                        <option value="outros">Outros</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Modelo / Marca</label>
                    <input className={inputClass} placeholder="Ex: Scania R450" value={vehicleForm.model || ''} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Placa Carreta 1</label>
                      <input className={`${inputClass} uppercase`} value={vehicleForm.trailerPlate1 || ''} onChange={e => setVehicleForm({...vehicleForm, trailerPlate1: e.target.value})} />
                    </div>
                    <div>
                      <label className={labelClass}>Placa Carreta 2</label>
                      <input className={`${inputClass} uppercase`} value={vehicleForm.trailerPlate2 || ''} onChange={e => setVehicleForm({...vehicleForm, trailerPlate2: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>RNTRC / ANTT</label>
                    <input className={inputClass} value={vehicleForm.antt || ''} onChange={e => setVehicleForm({...vehicleForm, antt: e.target.value})} />
                  </div>
                </>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg">
                  {editingId ? 'Salvar Alterações' : 'Criar Novo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierDetails;
