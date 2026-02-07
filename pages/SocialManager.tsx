import React, { useState } from 'react';
import {
    Share2,
    Instagram,
    Facebook,
    Send,
    Image as ImageIcon,
    Loader2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { publishToSocialMedia } from '../services/social';
import { uploadImageToR2 } from '../services/r2';

export const SocialManager: React.FC = () => {
    const [text, setText] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            const url = URL.createObjectURL(e.target.files[0]);
            setImageUrl(url);
        }
    };

    const handlePublish = async () => {
        if (!text) return alert("Escribe un texto para el post.");

        setLoading(true);
        setStatus('idle');

        try {
            let finalImageUrl = imageUrl;

            if (file) {
                const uploaded = await uploadImageToR2(file);
                if (uploaded) finalImageUrl = uploaded;
            }

            await publishToSocialMedia({
                text,
                image_url: finalImageUrl,
                platforms: ['facebook', 'instagram']
            });

            setStatus('success');
            setTimeout(() => {
                setText('');
                setFile(null);
                setImageUrl('');
                setStatus('idle');
            }, 3000);

        } catch (err) {
            console.error(err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-8rem)] glass-panel rounded-[2.5rem] p-8 animate-fadeIn flex flex-col gap-8 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-pink-600/20 blur-[100px] rounded-full mix-blend-screen animate-blob pointer-events-none"></div>

            <div className="flex items-center gap-6 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg text-white animate-slideDown">
                    <Share2 size={32} />
                </div>
                <div className="animate-slideDown" style={{ animationDelay: '0.1s' }}>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Social Manager</h1>
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-widest">Publicación Multi-Plataforma</p>
                </div>
            </div>

            <div className="flex gap-10 h-full relative z-10">
                {/* Editor */}
                <div className="flex-1 glass-card p-8 rounded-3xl flex flex-col gap-6 animate-slideUp" style={{ animationDelay: '0.2s' }}>
                    <h2 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                        Componer Post
                    </h2>

                    <div className="relative flex-1">
                        <textarea
                            className="w-full h-full bg-slate-900/50 border border-white/10 rounded-2xl p-6 font-medium text-slate-200 focus:ring-2 focus:ring-pink-500/50 outline-none resize-none placeholder:text-slate-600 transition-all focus:bg-slate-900/80"
                            placeholder="¿Qué historia vas a contar hoy?"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        />
                        <div className="absolute bottom-4 right-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            {text.length} Caracteres
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-slate-300 rounded-2xl text-xs font-bold uppercase transition-all group flex-1 justify-center">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ImageIcon size={16} className="text-pink-500" />
                            </div>
                            {file ? <span className="text-white">{file.name}</span> : 'Seleccionar Imagen / Video'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                    </div>

                    <button
                        onClick={handlePublish}
                        disabled={loading || !text}
                        className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all relative overflow-hidden group ${status === 'success' ? 'bg-green-500 text-white' :
                                status === 'error' ? 'bg-red-500 text-white' :
                                    'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:scale-[1.02]'
                            } disabled:opacity-50 disabled:hover:scale-100`}
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        {loading ? <Loader2 className="animate-spin" /> :
                            status === 'success' ? <><CheckCircle2 /> PUBLICADO CON ÉXITO</> :
                                status === 'error' ? <><AlertCircle /> ERROR DE PUBLICACIÓN</> :
                                    <><Send size={16} /> PUBLICAR AHORA</>}
                    </button>

                    <div className="flex justify-center gap-6 mt-2">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div> Facebook
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                            <div className="w-2 h-2 rounded-full bg-pink-500"></div> Instagram
                        </div>
                    </div>
                </div>

                {/* Pixel-Perfect Preview */}
                <div className="w-[380px] hidden xl:flex flex-col gap-4 animate-slideUp" style={{ animationDelay: '0.3s' }}>
                    <div className="text-center">
                        <h2 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Vista Previa</h2>
                    </div>

                    {/* Device Frame */}
                    <div className="bg-white rounded-[2.5rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden relative h-[750px]">
                        {/* Status Bar */}
                        <div className="h-8 bg-white flex justify-between items-center px-6 pt-2">
                            <span className="text-[10px] font-bold text-slate-900">9:41</span>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 bg-slate-900 rounded-full opacity-20"></div>
                                <div className="w-3 h-3 bg-slate-900 rounded-full opacity-20"></div>
                                <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
                            </div>
                        </div>

                        {/* App Header */}
                        <div className="h-12 border-b border-slate-100 flex justify-between items-center px-4 bg-white sticky top-0 z-10">
                            <div className="text-xs font-bold text-slate-900">SaladilloVivo</div>
                            <div className="text-[10px] font-bold text-slate-400">Posts</div>
                        </div>

                        {/* Post Content */}
                        <div className="bg-white pb-4">
                            {/* User User */}
                            <div className="flex items-center justify-between px-3 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                                        <div className="w-full h-full bg-white rounded-full p-[2px]">
                                            <img src="https://ui-avatars.com/api/?name=SV&background=000&color=fff" className="w-full h-full rounded-full object-cover" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 leading-tight">saladillovivo</span>
                                        <span className="text-[10px] text-slate-500 leading-tight">Saladillo, Buenos Aires</span>
                                    </div>
                                </div>
                                <div className="text-slate-900 font-bold">...</div>
                            </div>

                            {/* Image */}
                            <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                {imageUrl ? (
                                    <img src={imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-300">
                                        <ImageIcon size={48} />
                                        <span className="text-[10px] font-bold uppercase">Sin Imagen</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="px-3 py-3 flex justify-between items-center">
                                <div className="flex gap-4">
                                    <div className="hover:text-red-500 transition-colors cursor-pointer"><div className="w-6 h-6 border-2 border-slate-900 rounded-full"></div></div> {/* Heart Placeholder */}
                                    <div className="w-6 h-6 border-2 border-slate-900 rounded-full opacity-50"></div> {/* Comment Placeholder */}
                                    <div className="w-6 h-6 border-2 border-slate-900 rounded-full opacity-50"></div> {/* Share Placeholder */}
                                </div>
                                <div className="w-6 h-6 border-2 border-slate-900 rounded-full opacity-50"></div> {/* Bookmark Placeholder */}
                            </div>

                            {/* Likes & Caption */}
                            <div className="px-3 space-y-1">
                                <div className="text-xs font-bold text-slate-900">2,453 Me gusta</div>
                                <div className="text-xs text-slate-900">
                                    <span className="font-bold mr-2">saladillovivo</span>
                                    <span className="whitespace-pre-wrap">{text || 'Tu descripción aparecerá aquí...'}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase mt-2">HACE 2 MINUTOS</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
