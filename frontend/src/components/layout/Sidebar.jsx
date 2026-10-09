import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MonitorDot, FileText, Settings, LogOut } from 'lucide-react';
import useStore from '../../store/useStore';

export default function Sidebar() {
  const { clearAuth } = useStore();

  const links = [
    { to: '/', icon: <Home size={22} />, label: 'Home' },
    { to: '/pos', icon: <MonitorDot size={22} />, label: 'Billing' },
    { to: '/reports', icon: <FileText size={22} />, label: 'Reports' },
    { to: '/settings', icon: <Settings size={22} />, label: 'Settings' }
  ];

  return (
    <div className="w-[60px] h-screen bg-slate-900 flex flex-col items-center py-4 shrink-0 shadow-2xl relative z-50">
      <div className="font-chewy text-orange-500 text-2xl mb-8">LT</div>
      
      <div className="flex-1 flex flex-col gap-6 w-full">
        {links.map(link => (
          <NavLink 
            key={link.to} 
            to={link.to}
            className={({ isActive }) => 
              `w-full flex justify-center py-3 group relative transition-colors ${isActive ? 'text-white border-l-2 border-orange-500' : 'text-slate-500 hover:text-slate-300'}`
            }
          >
            {link.icon}
            <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {link.label}
            </div>
          </NavLink>
        ))}
      </div>

      <button 
        onClick={clearAuth} 
        className="text-slate-500 hover:text-red-500 transition-colors group relative p-3 w-full flex justify-center"
      >
        <LogOut size={22} />
        <div className="absolute left-14 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          Logout
        </div>
      </button>
    </div>
  );
}
