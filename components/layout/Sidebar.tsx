
import React, { useState, useRef, useEffect } from 'react';
import { MENU_ITEMS, APP_NAME } from '../../constants';
import { ModuleId, User as UserType } from '../../types';
import { Sprout, LogOut, User, Settings, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeModule: ModuleId;
  onNavigate: (id: ModuleId) => void;
  isOpen: boolean;
  currentUser: UserType;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, onNavigate, isOpen, currentUser, onLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setShowUserMenu(false);
    onLogout();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside 
      className={`
        fixed left-0 top-0 z-40 h-screen bg-slate-900 text-white transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-20'}
        flex flex-col border-r border-slate-800 shadow-xl
      `}
    >
      {/* Brand Section */}
      <div className="flex h-16 items-center justify-center border-b border-slate-800 bg-slate-950/50 cursor-pointer" onClick={() => onNavigate(ModuleId.HOME)}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary-600 p-2.5 text-white">
            <Sprout size={36} />
          </div>
          {isOpen && (
            <span className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap overflow-hidden">
              Suporte Grãos
            </span>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 space-y-1 py-4 px-3 scrollbar-hide ${isOpen ? 'overflow-y-auto' : 'overflow-visible'}`}>
        {MENU_ITEMS.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                group relative flex w-full items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon 
                className={`
                  flex-shrink-0 transition-colors
                  ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                `} 
                size={22} 
              />
              
              {isOpen && (
                <span className="ml-3 truncate animate-in fade-in slide-in-from-left-2 duration-300">{item.label}</span>
              )}
              
              {isOpen && isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-white animate-pulse" />
              )}

              {!isOpen && (
                <div className="
                  absolute left-full top-1/2 z-50 ml-4 -translate-y-1/2 w-max origin-left scale-0 rounded-md bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-xl
                  transition-all duration-200 group-hover:scale-100 border border-slate-700
                ">
                  {item.label}
                  <div className="absolute left-0 top-1/2 -ml-1 -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800 border-b border-l border-slate-700" />
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info / Footer */}
      <div className="relative border-t border-slate-800 bg-slate-950/30 p-4" ref={userMenuRef}>
        
        {/* Popup Menu */}
        {showUserMenu && (
          <div className={`
            absolute bottom-full left-0 mb-2 w-60 rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 overflow-hidden animate-in slide-in-from-bottom-2 z-50
            ${!isOpen ? 'left-full ml-2 bottom-0' : ''} 
          `}>
            <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
            </div>
            <div className="py-1">
              <button 
                onClick={() => { onNavigate(ModuleId.PROFILE); setShowUserMenu(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <User size={16} className="text-slate-400" />
                Meu Perfil
              </button>
              <button 
                onClick={() => { onNavigate(ModuleId.SETTINGS); setShowUserMenu(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings size={16} className="text-slate-400" />
                Configurações
              </button>
            </div>
            <div className="border-t border-slate-100 py-1">
              <button 
                type="button"
                onClick={handleLogoutClick}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                Sair do Sistema
              </button>
            </div>
          </div>
        )}

        <button 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`flex items-center w-full rounded-lg transition-colors ${showUserMenu ? 'bg-slate-800' : 'hover:bg-slate-800'} p-1`}
        >
          <div className="h-9 w-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner shrink-0 overflow-hidden border border-slate-600">
            {currentUser.avatar ? (
               <img src={currentUser.avatar} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
               <span>{getInitials(currentUser.name)}</span>
            )}
          </div>
          
          {isOpen && (
            <div className="ml-3 flex-1 text-left overflow-hidden">
              <p className="truncate text-sm font-medium text-white">{currentUser.name}</p>
              <p className="truncate text-xs text-slate-500 capitalize">{currentUser.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
          )}
          
          {isOpen && (
            <ChevronRight size={16} className={`text-slate-500 transition-transform ${showUserMenu ? 'rotate-90' : ''}`} />
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
