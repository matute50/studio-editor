import React, { useState, useRef, useEffect } from 'react';
import {
    Bot,
    Mic,
    Play,
    Square,
    Wand2,
    Users,
    Activity
} from 'lucide-react';

// Canvas based visualizer for high-performance rendering
const CanvasVisualizer: React.FC<{ analyser: AnalyserNode | null, isPlaying: boolean }> = ({ analyser, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Si no hay analyser, dbuijar estado idle
        if (!analyser) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barCount = 40;
            const barWidth = (canvas.width / barCount) - 4;
            ctx.fillStyle = '#cbd5e1'; // slate-300
            for (let i = 0; i < barCount; i++) {
                const x = i * (barWidth + 4) + 2;
                const y = (canvas.height - 4) / 2;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, 4, [2]);
                ctx.fill();
            }
            return;
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const renderFrame = () => {
            // Get frequency data
            analyser.getByteFrequencyData(dataArray);

            // Clear layout
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Gradient specific to Saladillo Vivo (Blue/Violet to Red/Pink)
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#8b5cf6'); // Violet
            gradient.addColorStop(0.5, '#ec4899'); // Pink
            gradient.addColorStop(1, '#ef4444'); // Red
            ctx.fillStyle = gradient;

            // Draw bars
            // We only draw the lower half of frequencies which usually has the voice data
            const barCount = 40;
            const step = Math.floor(bufferLength / 2 / barCount);
            const barWidth = (canvas.width / barCount) - 4;

            for (let i = 0; i < barCount; i++) {
                const dataIndex = i * step;
                const value = dataArray[dataIndex];
                // Scale height to fit canvas, favoring higher values
                const percent = value / 255;
                const barHeight = Math.max(4, percent * canvas.height * 0.8);

                // Center the bars vertically
                const x = i * (barWidth + 4) + 2;
                const y = (canvas.height - barHeight) / 2;

                // Rounded rect simulation
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth, barHeight, [4]);
                } else {
                    ctx.rect(x, y, barWidth, barHeight);
                }
                ctx.fill();
            }

            if (isPlaying) {
                animationRef.current = requestAnimationFrame(renderFrame);
            }
        };

        if (isPlaying) {
            renderFrame();
        } else {
            cancelAnimationFrame(animationRef.current);
            // Draw one frame (could be silence) to clear or show idle
            renderFrame();
        }

        return () => cancelAnimationFrame(animationRef.current);
    }, [analyser, isPlaying]);

    return <canvas ref={canvasRef} width={600} height={200} className="w-full h-full object-contain" />;
};

export const AvatarStudio: React.FC = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioSrc, setAudioSrc] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAudioFile(file);
            setAudioSrc(URL.createObjectURL(file));
        }
    };

    const setupAudioContext = () => {
        if (!audioRef.current) return;

        // If context exists, reuse it. Browsers limit number of AudioContexts.
        if (!audioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContext();
            audioContextRef.current = ctx;
        }

        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Create analyser if not exists
        if (!analyserRef.current) {
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
        }

        // Create source ONLY ONCE per audio element
        if (!sourceRef.current) {
            const source = ctx.createMediaElementSource(audioRef.current);
            sourceRef.current = source;
            source.connect(analyserRef.current!);
            analyserRef.current!.connect(ctx.destination);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            if (!audioContextRef.current || !sourceRef.current) {
                setupAudioContext();
            }
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
        }
    }, [isPlaying]);

    return (
        <div className="h-[calc(100vh-8rem)] bg-slate-50 rounded-3xl p-8 border border-slate-200 animate-fadeIn flex flex-col gap-8">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg text-white">
                    <Bot size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Avatar Studio</h1>
                    <p className="text-[10px] items-center gap-2 font-bold uppercase text-slate-400">Presentador Virtual (Core Audio Engine)</p>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                {/* Central Visualizer Container */}
                <div className="w-full max-w-2xl h-64 z-10 flex items-center justify-center">
                    <CanvasVisualizer analyser={analyserRef.current} isPlaying={isPlaying} />
                </div>

                <div className="z-10 flex flex-col items-center gap-4">
                    {!audioFile ? (
                        <label className="cursor-pointer px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-violet-600 transition-all shadow-lg flex items-center gap-2">
                            <Mic size={20} /> Cargar Voz (IA o Humana)
                            <input type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                        </label>
                    ) : (
                        <div className="flex items-center gap-4 bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-xl">
                            <audio
                                ref={audioRef}
                                src={audioSrc}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => setIsPlaying(false)}
                                className="hidden"
                            />

                            <button
                                onClick={() => {
                                    if (audioRef.current) {
                                        if (isPlaying) audioRef.current.pause();
                                        else audioRef.current.play();
                                    }
                                }}
                                className="w-16 h-16 bg-violet-600 text-white rounded-2xl flex items-center justify-center hover:bg-violet-700 transition-all shadow-lg hover:scale-105"
                            >
                                {isPlaying ? <Square size={24} fill="white" /> : <Play size={32} fill="white" className="ml-1" />}
                            </button>

                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400">Archivo Cargado</span>
                                <span className="text-sm font-bold text-slate-800 max-w-[200px] truncate">{audioFile.name}</span>
                                <button onClick={() => { setAudioFile(null); setAudioSrc(''); setIsPlaying(false); }} className="text-left text-xs font-bold text-red-500 hover:text-red-600 mt-1">
                                    Eliminar / Cambiar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-8 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-violet-100">
                        <Activity size={12} /> Live Frequency Analysis
                    </div>
                </div>
            </div>
        </div>
    );
};
