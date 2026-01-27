import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getGeminiResponse } from '../services/gemini';
import { TickerMessage } from '../types';
import { 
  Type, 
  Plus, 
  Trash2, 
  Power, 
  PowerOff, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  Info,
  Save,
  Send
} from 'lucide-react';

export const TickerEditor: React.FC = () => {
  const [messages, setMessages] = useState<TickerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [priority, setPriority] = useState<TickerMessage['priority']>('info');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('ticker_messages').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('ticker_messages').insert([{ text: inputText, priority: priority, active: true }]).select();
      if (error) throw error;
      setMessages([data[0], ...messages]);
      setInputText('');
      setSuccess("Publicado.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const executeDelete = async () => {
    if (!showDeleteConfirm) return;
    const id = showDeleteConfirm;
    setShowDeleteConfirm(null);
    try {
      await supabase.from('ticker_messages').delete().eq('id', id);
      setMessages(messages.filter(m => m.id !== id));
      setSuccess("Borrado.");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) { setError(err.message); }
  };

  const handleIAOptimize = async () => {
    if (!inputText.trim()) return;
    setOptimizing(true);
    try {
      const result = await getGeminiResponse(`Resume para ticker: ${inputText}`);
      setInputText(result.trim());
    } catch (err) { console.error(err); } finally { setOptimizing(false); }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="font-bold mb-4">¿Borrar mensaje?</h3>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2 bg-slate-100 rounded-lg">No</button>
              <button onClick={executeDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Sí</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2"><Type className="text-pink-600" /> <h2 className="font-bold">Urgentes</h2></div>
          <button onClick={fetchMessages}><RefreshCw size={18} className={`${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="bg-slate-900 h-10 flex items-center text-white overflow-hidden text-sm uppercase tracking-wider">
            <div className="bg-red-600 px-4 h-full flex items-center font-bold">ALERTA</div>
            <div className="px-4 whitespace-nowrap animate-marquee">{messages.find(m => m.active)?.text || 'Sin noticias activas...'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center"><h3 className="font-bold">Nuevo</h3><span className="text-[10px] text-slate-400 font-bold">{inputText.length}/150</span></div>
            <textarea value={inputText} onChange={(e) => setInputText(e.target.value.substring(0, 150))} placeholder="Texto..." className="w-full p-3 bg-slate-50 border rounded-xl h-32 outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
            <div className="flex gap-2">
                <button onClick={handleIAOptimize} disabled={optimizing || !inputText} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 flex justify-center disabled:opacity-50" title="Optimizar IA">{optimizing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}</button>
                <div className="flex gap-1">
                    {(['info', 'alert', 'urgent'] as const).map(p => (
                        <button key={p} onClick={() => setPriority(p)} className={`w-8 h-8 rounded-full border-2 transition-all ${priority === p ? (p === 'urgent' ? 'bg-red-600 border-white' : p === 'alert' ? 'bg-yellow-400 border-white' : 'bg-blue-600 border-white') : 'bg-slate-100 border-transparent opacity-30'}`} title={p} />
                    ))}
                </div>
            </div>
            <button onClick={handleAddMessage} disabled={saving || !inputText.trim()} className="w-full bg-slate-900 text-white py-3 rounded-xl flex justify-center shadow-lg disabled:opacity-50">{saving ? <Loader2 className="animate-spin" /> : <Send size={20} />}</button>
            {error && <div className="text-[10px] text-red-500 font-bold">{error}</div>}
        </div>

        <div className="lg:col-span-2 space-y-3">
            {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-slate-200" /></div> : messages.map(m => (
                <div key={m.id} className={`bg-white p-4 rounded-xl border flex items-center gap-4 transition-all ${!m.active && 'opacity-50 grayscale'}`}>
                    <div className={`w-2 h-10 rounded-full shrink-0 ${m.priority === 'urgent' ? 'bg-red-600' : m.priority === 'alert' ? 'bg-yellow-400' : 'bg-blue-500'}`} />
                    <div className="flex-1 text-sm font-medium text-slate-700">{m.text}</div>
                    <div className="flex gap-2 shrink-0">
                        <button onClick={() => {}} className={`p-2 rounded-lg ${m.active ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>{m.active ? <Power size={16} /> : <PowerOff size={16} />}</button>
                        <button onClick={() => setShowDeleteConfirm(m.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};