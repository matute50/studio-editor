
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Newspaper,
  Presentation,
  CalendarDays,
  Megaphone,
  Video,
  Radio,
  Image as ImageIcon,
  Mic,
  AudioWaveform,
  UserCheck,
  Globe,
  Clapperboard
} from 'lucide-react';


const navItems = [
  { title: 'Inicio Panel', path: '/', icon: LayoutDashboard },
  { title: 'Escritorio Responsable', path: '/responsable', icon: UserCheck },
  { title: 'VozArgentina Studio', path: '/voz-argentina-studio', icon: AudioWaveform },
  { title: 'Editor Noticias', path: '/noticias', icon: Newspaper },
  { title: 'Estudio Locución', path: '/audio-producer', icon: Mic },
  { title: 'Generar Slides', path: '/slides', icon: Presentation },
  { title: 'YouTube Studio', path: '/youtube-studio', icon: Video },
  { title: 'Social Manager', path: '/social-manager', icon: Megaphone },
  { title: 'Avatar Studio', path: '/avatar-studio', icon: UserCheck },
  { title: 'Control Streaming', path: '/streaming', icon: Radio },
  { title: 'Agenda Eventos', path: '/agenda', icon: CalendarDays },
  { title: 'Vista Previa Portal', path: '/portal', icon: Globe },
];

export const Sidebar: React.FC = () => {
  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 shadow-xl z-20">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-blue-400 uppercase">Saladillo Vivo</h1>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Panel de Gestión</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-bold text-[13px] tracking-tight">{item.title}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-5 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Editor Conectado</span>
        </div>
      </div>
    </div>
  );
};
