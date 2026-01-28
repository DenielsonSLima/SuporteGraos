import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, HelpCircle, ShoppingCart, Truck, AlertTriangle, ChevronRight, X, User, DollarSign, LayoutGrid, FileText, Loader2 } from 'lucide-react';
import { ModuleId } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { searchService, SearchResult } from '../../services/searchService';
import LatencyIndicator from '../monitoring/LatencyIndicator';

interface HeaderProps {
  toggleSidebar: () => void;
  title: string;
  onNavigate: (id: ModuleId) => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, title, onNavigate }) => {
  const { unreadCount, markAllAsRead, notifications } = useNotification();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  // Use ReturnType<typeof setTimeout> for compatibility in both browser and node environments
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

  // 🔄 Atualizar cache info quando dados mudarem
  useEffect(() => {
    const updateCacheInfo = () => {
      try {
        const info = DashboardCache.getCacheInfo();
        setCacheInfo(info);
      } catch (error) {
        console.error('Error getting cache info:', error);
      }
    };

    // Atualizar inicialmente
    updateCacheInfo();

    window.addEventListener('data:updated', updateCacheInfo);
    window.addEventListener('financial:updated', updateCacheInfo);

    // Atualizar a cada 10 segundos
    const interval = setInterval(updateCacheInfo, 10000);

    return () => {
      window.removeEventListener('data:updated', updateCacheInfo);
      window.removeEventListener('financial:updated', updateCacheInfo);
      clearInterval(interval);
    };
  }, []);
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchService.searchAll(query);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  };

  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.moduleId);
    setShowSearchResults(false);
    setSearchQuery('');
    
    if (result.metadata) {
       window.dispatchEvent(new CustomEvent('app:navigate', { 
         detail: { moduleId: result.moduleId, ...result.metadata } 
       }));
    }
  };

  const getIconForType = (type: string) => {
      switch(type) {
          case 'partner': return User;
          case 'purchase': return ShoppingCart;
          case 'sales': return DollarSign;
          case 'loading': return Truck;
          case 'financial': return FileText;
          case 'menu': return LayoutGrid;
          default: return Search;
      }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <button type="button" className="-m-2.5 p-2.5 text-slate-700 lg:hidden" onClick={toggleSidebar}>
        <span className="sr-only">Open sidebar</span>
        <Menu size={20} />
      </button>

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-4">
             <h1 className="text-lg font-bold text-slate-800">{title}</h1>
        </div>

        <div className="relative flex flex-1 items-center justify-center max-w-lg mx-auto" ref={searchRef}>
          <label htmlFor="search-field" className="sr-only">Buscar</label>
          <Search size={20} className="pointer-events-none absolute left-3 top-1/2 h-full w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="search-field"
            className="block h-10 w-full rounded-full border-0 bg-slate-100 py-0 pl-10 pr-4 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm"
            placeholder="Buscar parceiros, pedidos, cargas..."
            type="search"
            value={searchQuery}
            onChange={handleSearch}
            autoComplete="off"
            onFocus={() => { if(searchResults.length > 0) setShowSearchResults(true); }}
          />
          {isSearching && (
             <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 size={16} className="animate-spin text-slate-400" />
             </div>
          )}

          {showSearchResults && (
            <div className="absolute top-12 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-2">
               {searchResults.length === 0 ? (
                   <div className="p-4 text-center text-sm text-slate-500">Nenhum resultado encontrado.</div>
               ) : (
                   searchResults.map(result => {
                       const Icon = getIconForType(result.type);
                       return (
                           <button
                             key={result.id}
                             onClick={() => handleResultClick(result)}
                             className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-center gap-3 transition-colors"
                           >
                               <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                   <Icon size={16} />
                               </div>
                               <div>
                                   <p className="text-sm font-bold text-slate-800">{result.title}</p>
                                   <p className="text-xs text-slate-500">{result.subtitle}</p>
                               </div>
                               <ChevronRight size={16} className="ml-auto text-slate-300" />
                           </button>
                       );
                   })
               )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* ⚡ Indicador de Latência */}
          <LatencyIndicator size="md" showLabel={true} />
          
          {/* 🔧 Botões alinhados verticalmente */}
          <button 
            type="button" 
            className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500 flex items-center" 
            onClick={() => onNavigate(ModuleId.HELP)}
          >
             <HelpCircle size={20} />
          </button>
          
          <div className="relative" ref={notificationRef}>
            <button 
                type="button" 
                className="-m-2.5 p-2.5 text-slate-400 hover:text-slate-500 relative flex items-center"
                onClick={() => { setShowNotifications(!showNotifications); if(!showNotifications) markAllAsRead(); }}
            >
                <span className="sr-only">View notifications</span>
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                )}
            </button>

            {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-slate-900/5 focus:outline-none animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-900">Notificações</h3>
                        {unreadCount > 0 && <span className="text-xs text-primary-600 font-medium">{unreadCount} novas</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-sm text-slate-500">Sem notificações recentes.</div>
                        ) : (
                            notifications.map(notification => (
                                <div key={notification.id} className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">
                                            {notification.type === 'alert' ? <AlertTriangle size={16} className="text-amber-500" /> : <Bell size={16} className="text-slate-400" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-2">{notification.time}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>

          <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
};

export default Header;