
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { DashboardHome } from './pages/DashboardHome';
import { NewsEditor } from './pages/NewsEditor';
import { SlideGenerator } from './pages/SlideGenerator';
import { AudioProducer } from './pages/AudioProducer';
import { VozArgentinaStudio } from './pages/VozArgentinaStudio';
import { ResponsibleDashboard } from './pages/ResponsibleDashboard';
import { PublicHome } from './pages/PublicHome';
import { AIAssistant } from './components/AIAssistant';
import { AuthProvider } from './context/AuthContext';
import { Bell, Search, User } from 'lucide-react';

const TopBar: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-10 flex items-center justify-between px-8 shadow-sm">
      <div className="flex items-center w-96 bg-slate-50 rounded-full px-4 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <Search className="w-4 h-4 text-slate-400 mr-2" />
        <input 
          type="text" 
          placeholder="Buscar contenido..." 
          className="bg-transparent border-none focus:outline-none w-full text-sm font-medium text-slate-700 placeholder-slate-400"
        />
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">Responsable</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Saladillo Vivo</p>
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
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <TopBar />
      <main className="ml-64 pt-24 pb-12 px-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <AIAssistant />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Admin Routes - Home is now the Dashboard */}
          <Route path="/" element={<Layout><DashboardHome /></Layout>} />
          
          {/* Main App Routes */}
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/responsable" element={<Layout><ResponsibleDashboard /></Layout>} />
          <Route path="/voz-argentina-studio" element={<Layout><VozArgentinaStudio /></Layout>} />
          <Route path="/noticias" element={<Layout><NewsEditor /></Layout>} />
          <Route path="/audio-producer" element={<Layout><AudioProducer /></Layout>} />
          <Route path="/slides" element={<Layout><SlideGenerator /></Layout>} />
          
          {/* Portal Vista Previa */}
          <Route path="/portal" element={<PublicHome />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
