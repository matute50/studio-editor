
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardHome } from './pages/DashboardHome';
import { NewsEditor } from './pages/NewsEditor';
import { SlideGenerator } from './pages/SlideGenerator';
import { AudioProducer } from './pages/AudioProducer';
import { VozArgentinaStudio } from './pages/VozArgentinaStudio';
import { ResponsibleDashboard } from './pages/ResponsibleDashboard';
import { SocialManager } from './pages/SocialManager';
import { AvatarStudio } from './pages/AvatarStudio';
import { StreamingControl } from './pages/StreamingControl';
// import { DailyShowDirector } from './pages/DailyShowDirector';
import { PublicHome } from './pages/PublicHome';
import { AIAssistant } from './components/AIAssistant';
import { Bell, User, Maximize2, Minimize2, Monitor, LayoutTemplate } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';

const TopBar: React.FC<{ isZen: boolean; setZen: (v: boolean) => void }> = ({ isZen, setZen }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className={`h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 fixed top-0 right-0 z-30 flex items-center justify-between px-8 shadow-sm transition-all duration-500 ${isZen ? 'left-0 opacity-0 -translate-y-full pointer-events-none' : 'left-64'}`}>


      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
          <button
            onClick={() => setZen(true)}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="Modo Zen (Ocultar UI)"
          >
            <LayoutTemplate size={20} />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            title="Pantalla Completa Navegador"
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>

        <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden md:block">
            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">Responsable</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Master Studio</p>
          </div>
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-blue-400 border border-white/10 shadow-lg">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  );
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isZen, setIsZen] = useState(false);

  // Escuchar tecla ESC para salir del modo Zen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      <div className={`transition-all duration-500 fixed left-0 top-0 h-full z-40 ${isZen ? '-translate-x-full' : 'translate-x-0'}`}>
        <Sidebar />
      </div>

      <div className={`flex-1 flex flex-col transition-all duration-500 ${isZen ? 'ml-0' : 'ml-64'}`}>
        <TopBar isZen={isZen} setZen={setIsZen} />

        {isZen && (
          <button
            onClick={() => setIsZen(false)}
            className="fixed top-6 right-6 z-[100] p-4 bg-slate-900/80 backdrop-blur text-white rounded-2xl shadow-2xl hover:bg-blue-600 transition-all animate-fadeIn group"
          >
            <Minimize2 size={24} className="group-hover:scale-110 transition-transform" />
            <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Salir Modo Pantalla Completa
            </span>
          </button>
        )}

        <main className={`flex-1 transition-all duration-500 ${isZen ? 'p-0' : 'pt-16 p-0'}`}>
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
      {!isZen && <AIAssistant />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout><DashboardHome /></Layout>} />
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/responsable" element={<Layout><ResponsibleDashboard /></Layout>} />
          <Route path="/voz-argentina-studio" element={<Layout><VozArgentinaStudio /></Layout>} />
          <Route path="/noticias" element={<Layout><NewsEditor /></Layout>} />
          <Route path="/audio-producer" element={<Layout><AudioProducer /></Layout>} />
          <Route path="/slides" element={<Layout><SlideGenerator /></Layout>} />
          {/* <Route path="/daily-show" element={<Layout><DailyShowDirector /></Layout>} /> */}
          <Route path="/social-manager" element={<Layout><SocialManager /></Layout>} />
          <Route path="/avatar-studio" element={<Layout><AvatarStudio /></Layout>} />
          <Route path="/streaming" element={<Layout><StreamingControl /></Layout>} />
          <Route path="/portal" element={<PublicHome />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
