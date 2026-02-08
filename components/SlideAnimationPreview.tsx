
import React, { useMemo, useRef, useLayoutEffect, useState } from 'react';
import { cleanAIText, cleanTickerText } from '../services/gemini';

const MASTER_TOP = '3.61%';
const TITLE_AREA_BOTTOM = '14.52%';
const MASTER_HEIGHT = '8.33%';
const TITLE_BG_HEIGHT = '20%';
const BRAND_BLUE = '#003399';

interface CropPercent {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SlideAnimationPreviewProps {
  images: string[];
  imageCrops?: Record<number, CropPercent>;
  className?: string;
  audioDuration: number;
  tickerMessages?: string[];
  title?: string;
  fontScale?: number;
}

const ParticlesBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: { x: number, y: number, vx: number, vy: number, color: string }[] = [];
    const colors = [BRAND_BLUE, '#FFFFFF', '#000000'];
    const countPerColor = 5;
    const size = 27;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    window.addEventListener('resize', resize);
    resize();

    colors.forEach(color => {
      for (let i = 0; i < countPerColor; i++) {
        particles.push({
          x: Math.random() * (canvas.width - size),
          y: Math.random() * (canvas.height - size),
          vx: (Math.random() - 0.5) * (1.5 + Math.random() * 2.5),
          vy: (Math.random() - 0.5) * (1.5 + Math.random() * 2.5),
          color: color
        });
      }
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.filter = 'blur(4px)';

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        else if (p.x > canvas.width - size) { p.x = canvas.width - size; p.vx *= -1; }

        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        else if (p.y > canvas.height - size) { p.y = canvas.height - size; p.vy *= -1; }

        ctx.strokeStyle = p.color;
        ctx.strokeRect(p.x, p.y, size, size);
      }
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
};

export const SlideAnimationPreview: React.FC<SlideAnimationPreviewProps> = ({
  images = [],
  imageCrops = {},
  className = "",
  audioDuration,
  tickerMessages = [],
  title = "",
  fontScale = 1.0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLDivElement>(null);
  const [dynamicFontSize, setDynamicFontSize] = useState<string | null>(null);

  // Deduplicar imágenes para la previsualización
  const uniqueImages = useMemo(() => Array.from(new Set(images)).filter(Boolean), [images]);

  const totalDuration = audioDuration || 10;
  const imageCount = uniqueImages.length || 1;
  const timePerImage = totalDuration / imageCount;

  const animationId = useMemo(() => `preview-${Math.random().toString(36).substr(2, 9)}`, [uniqueImages, imageCrops, totalDuration]);

  const tickerText = useMemo(() => {
    const combined = tickerMessages.map(msg => cleanTickerText(msg, title)).join(' • ');
    return combined.toUpperCase();
  }, [tickerMessages, title]);

  const { titleLine1, titleLine2 } = useMemo(() => {
    // Primero limpiamos el texto base (removiendo marcas tipo [X])
    const cleanTitle = cleanAIText(title || "").toUpperCase();

    // Priorizamos el salto de línea marcado por el pipe |
    const parts = cleanTitle.split('|').map(s => s.trim());

    let l1 = "";
    let l2 = "";

    if (parts.length >= 2) {
      l1 = parts[0];
      l2 = parts.slice(1).join(' ');
    } else {
      // Fallback a división inteligente por palabras si no hay pipe
      const words = cleanTitle.split(' ');
      if (words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        l1 = words.slice(0, mid).join(' ');
        l2 = words.slice(mid).join(' ');
      } else {
        l1 = cleanTitle;
        l2 = "";
      }
    }
    return { titleLine1: l1, titleLine2: l2 };
  }, [title]);

  // Efecto para ajustar el tamaño de fuente si excede el 75% del ancho del contenedor
  useLayoutEffect(() => {
    if (!containerRef.current || !titleTextRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const maxWidth = containerWidth * 0.75;

    titleTextRef.current.style.fontSize = '';
    const spans = titleTextRef.current.querySelectorAll('span');
    let maxSpanWidth = 0;
    spans.forEach(s => {
      maxSpanWidth = Math.max(maxSpanWidth, s.offsetWidth);
    });

    if (maxSpanWidth > maxWidth) {
      const currentFontSize = parseFloat(window.getComputedStyle(titleTextRef.current).fontSize);
      const ratio = maxWidth / maxSpanWidth;
      setDynamicFontSize(`${currentFontSize * ratio}px`);
    } else {
      setDynamicFontSize(null);
    }
  }, [titleLine1, titleLine2, fontScale, uniqueImages]);

  const generateImageKeyframes = (idx: number) => {
    const crop = imageCrops[idx] || { x: 0, y: 0, width: 100, height: 100 };
    const scaleImg = 100 / crop.width;
    const translateX = (50 - (crop.x + crop.width / 2)) * scaleImg;
    const translateY = (50 - (crop.y + crop.height / 2)) * scaleImg;

    const startP = (idx * timePerImage / totalDuration) * 100;
    const endP = ((idx + 1) * timePerImage / totalDuration) * 100;
    const fadeP = (Math.min(1.0, timePerImage) / totalDuration) * 100;

    return `
      @keyframes anim-img-${animationId}-${idx} {
        0%, ${startP}% { opacity: 0; z-index: 10; transform: translate3d(0, 0, 0) scale(1); }
        ${idx === 0 ? '0%' : `${startP + 0.1}%`} { opacity: 1; z-index: 20; }
        ${endP}% { transform: translate3d(${translateX}%, ${translateY}%, 0) scale(${scaleImg}); opacity: 1; z-index: 20; }
        ${idx === imageCount - 1 ? '100%' : `${endP + fadeP}%`} { opacity: 0; z-index: 10; }
        100% { opacity: 0; }
      }
    `;
  };

  const p_in_start = (1.5 / totalDuration) * 100;
  const p_out_start = ((totalDuration - 1.0) / totalDuration) * 100;

  const baseKeyframes = `
    @keyframes progress-${animationId} { 0% { width: 0%; } 100% { width: 100%; } }
    @keyframes title-progress-${animationId} { 0% { clip-path: inset(0 0 0 100%); } 100% { clip-path: inset(0 0 0 0%); } }
    @keyframes logo-progress-${animationId} { 0% { width: 0%; } 100% { width: 100%; } }
    @keyframes ticker-${animationId} { 0% { transform: translate3d(100cqw, 0, 0); } 100% { transform: translate3d(-100%, 0, 0); } }
    @keyframes fade-out-${animationId} { 0%, ${p_out_start}% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes ping-pong-${animationId} {
      0%, 100% { right: 0%; }
      50% { right: 100%; }
    }
    @keyframes particle-bounce-${animationId} {
      0% { transform: translate(var(--x1), var(--y1)); }
      25% { transform: translate(var(--x2), var(--y2)); }
      50% { transform: translate(var(--x3), var(--y3)); }
      75% { transform: translate(var(--x4), var(--y4)); }
      100% { transform: translate(var(--x1), var(--y1)); }
    }
    @keyframes title-area-${animationId} {
      0% { opacity: 0; transform: translateX(100px); }
      ${p_in_start}% { opacity: 1; transform: translateX(0); }
      ${p_out_start}% { opacity: 1; transform: translateX(0); }
      100% { opacity: 0; transform: translateX(50px); }
    }
  `;

  return (
    <div ref={containerRef} className={`w-full h-full bg-black overflow-hidden relative isolate ${className}`} style={{ containerType: 'size' }}>
      <style>{baseKeyframes + uniqueImages.map((_, i) => generateImageKeyframes(i)).join('')}</style>

      {uniqueImages.map((img, i) => (
        <img
          key={i}
          src={img}
          className="absolute inset-0 w-full h-full object-cover origin-center opacity-0"
          style={{
            animation: `anim-img-${animationId}-${i} ${totalDuration}s linear infinite`,
            zIndex: 10
          }}
          alt={`Slide View ${i}`}
        />
      ))}

      <div className="absolute inset-0 z-[100] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%)' }} />

      {/* Progress Bars */}
      <div className="absolute top-0 right-0 w-full z-[200] h-[1.2cqh] bg-black/20 overflow-hidden">
        <div className="h-full bg-[#003399]" style={{ animation: `progress-${animationId} ${totalDuration}s linear infinite` }} />
      </div>
      <div className="absolute bottom-[9.16cqh] left-0 w-full z-[200] h-[1.2cqh] bg-black/20 overflow-hidden">
        <div className="h-full bg-[#003399]" style={{ animation: `progress-${animationId} ${totalDuration}s linear infinite` }} />
      </div>

      {/* Ticker */}
      <div className="absolute bottom-0 left-0 w-full z-[250] flex flex-col h-[9.16%] bg-black/95 border-t border-white/10">
        <div className="h-full flex items-center relative overflow-hidden">
          <div className="h-full flex items-center justify-center z-[260] bg-[#003399] shadow-[5px_0_15px_rgba(0,0,0,0.3)]" style={{ width: '17.81%' }}>
            <span className="text-white tracking-tight uppercase whitespace-nowrap font-black text-center" style={{ fontSize: '3.4cqh', width: '100%' }}>ÚLTIMA NOTICIA</span>
          </div>
          <div className="whitespace-nowrap flex items-center absolute top-0 h-full z-[240]" style={{ left: 0, width: 'auto', animation: `ticker-${animationId} ${totalDuration}s linear infinite` }}>
            <span className="text-white font-black tracking-wide inline-block uppercase flex items-center h-full" style={{ fontSize: '4.8cqh', paddingLeft: '17.81cqw' }}>{tickerText}</span>
          </div>
        </div>
      </div>

      {/* Logo Area */}
      <div className="absolute left-0 z-[150] pointer-events-none" style={{
        top: MASTER_TOP, height: MASTER_HEIGHT, background: 'linear-gradient(to right, #003399 0%, transparent 100%)',
        backdropFilter: 'blur(8px)', borderRadius: '0 2rem 2rem 0', paddingRight: 'calc(2rem - 25px)', display: 'flex', alignItems: 'center'
      }}>
        <img src="https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/logos/NOTICIAS.png" className="h-[75%] w-auto ml-[2.5cqw] drop-shadow-[0_0_15px_rgba(0,0,0,1)]" alt="Logo" />
        <div
          className="absolute bottom-0 left-0 h-[0.6cqh] bg-[#ff0000] blur-[2px] shadow-[0_0_10px_rgba(255,0,0,0.8)] z-[160]"
          style={{ animation: `logo-progress-${animationId} ${totalDuration}s linear infinite` }}
        />
      </div>

      {/* Title Area */}
      <div className="absolute z-[150] pointer-events-none" style={{
        bottom: TITLE_AREA_BOTTOM, right: '0', width: 'fit-content', maxWidth: '85%', height: TITLE_BG_HEIGHT, borderRadius: '2.5rem 0 0 2.5rem',
        background: `linear-gradient(to left, ${BRAND_BLUE} 0%, transparent 100%)`,
        backdropFilter: 'blur(8px)', paddingRight: 'calc(3.5% + 10px)', paddingLeft: '6rem',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
        animation: `title-area-${animationId} ${totalDuration}s linear infinite`,
        overflow: 'visible'
      }}>
        {/* Animated Red Rectangles and Particles Backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1, borderRadius: '2.5rem 0 0 2.5rem' }}>
          <div className="absolute top-0 w-[24%] h-full bg-red-600/60 blur-[8px]" style={{ animation: `ping-pong-${animationId} 12s ease-in-out infinite` }} />
          <div className="absolute top-0 w-[15%] h-full bg-red-500/40 blur-[8px]" style={{ animation: `ping-pong-${animationId} 8s ease-in-out infinite reverse` }} />
          <div className="absolute top-0 w-[12.5%] h-full bg-red-700/50 blur-[8px]" style={{ animation: `ping-pong-${animationId} 4s ease-in-out infinite` }} />
          <ParticlesBackground />
        </div>

        <div ref={titleTextRef} className="text-white text-right tracking-tighter flex flex-col items-end" style={{
          fontWeight: '900', fontStyle: 'italic',
          fontSize: dynamicFontSize || `calc(9.4cqh * ${fontScale})`,
          lineHeight: '0.92', textTransform: 'uppercase', whiteSpace: 'nowrap',
          paddingRight: '37px',
          marginRight: '-27px',
          transform: 'translateX(22px)',
          textShadow: '0 0 15px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,1)'
        }}>
          <span>{titleLine1}</span>
          <span>{titleLine2}</span>
        </div>

        <div
          className="absolute bottom-0 right-0 h-[0.6cqh] z-[160]"
          style={{
            width: 'calc(100% - 2.5rem)',
            background: 'linear-gradient(to left, #ff0000 0%, rgba(255,0,0,0.1) 100%)',
            animation: `title-progress-${animationId} ${totalDuration}s linear infinite`
          }}
        />
      </div>

      {/* Final Fade Screen */}
      <div className="absolute inset-0 z-[1000] bg-black pointer-events-none" style={{ animation: `fade-out-${animationId} ${totalDuration}s linear infinite` }} />
    </div>
  );
};
