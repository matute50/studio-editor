
import React, { useEffect, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '../services/supabase';
import { uploadHtmlToR2, deleteFileFromR2 } from '../services/r2';
import { SlideAnimationPreview } from '../components/SlideAnimationPreview';
import { Article } from '../types';
import {
  Presentation,
  Loader2,
  RefreshCw,
  LayoutList,
  MonitorPlay,
  Wand2,
  Code,
  Crop,
  Check,
  X,
  ZoomIn,
  Trash2,
  CheckCircle2
} from 'lucide-react';

interface CropPercent {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SlideGenerator: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [imageCrops, setImageCrops] = useState<Record<number, CropPercent>>({});

  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const [audioLoading, setAudioLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingSlideId, setDeletingSlideId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => { fetchArticles(); }, []);

  const fetchArticles = async () => {
    setLoadingList(true);
    try {
      const { data } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      setArticles(data || []);
      if (selectedArticle) {
        const updated = data?.find(a => a.id === selectedArticle.id);
        if (updated) setSelectedArticle(updated);
      }
    } catch (err: any) { setError(err.message); } finally { setLoadingList(false); }
  };

  useEffect(() => {
    if (selectedArticle) {
      const images = Array.from(new Set([
        selectedArticle.image_url,
        ...(selectedArticle.images_urls || [])
      ])).filter(Boolean);

      setAllImages(images);
      setActiveImgIndex(0);
      setImageCrops({});
      setAudioReady(false);
      setAudioDuration(0);

      const refreshArticleData = async () => {
        setAudioLoading(true);
        try {
          const { data: freshArticle } = await supabase
            .from('articles')
            .select('audio_url, animation_duration')
            .eq('id', selectedArticle.id)
            .single();

          if (freshArticle?.audio_url) {
            if (freshArticle.animation_duration) {
              setAudioDuration(freshArticle.animation_duration);
              setAudioReady(true);
              setAudioLoading(false);
            } else {
              const probe = new Audio(`${freshArticle.audio_url}?v=${Date.now()}`);
              probe.onloadedmetadata = () => {
                setAudioDuration(probe.duration);
                setAudioReady(true);
                setAudioLoading(false);
              };
              probe.onerror = () => setAudioLoading(false);
            }
          } else {
            setAudioLoading(false);
          }
        } catch (e) {
          setAudioLoading(false);
        }
      };
      refreshArticleData();
    }
  }, [selectedArticle?.id]);

  const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
    if (selectedArticle && allImages[activeImgIndex]) {
      const img = new Image();
      img.src = allImages[activeImgIndex];
      img.onload = () => {
        const newCrop = {
          x: (croppedAreaPixels.x / img.width) * 100,
          y: (croppedAreaPixels.y / img.height) * 100,
          width: (croppedAreaPixels.width / img.width) * 100,
          height: (croppedAreaPixels.height / img.height) * 100
        };
        setImageCrops(prev => ({ ...prev, [activeImgIndex]: newCrop }));
      };
    }
  }, [selectedArticle, allImages, activeImgIndex]);

  const calculateAutoDuration = (text: string): number => {
    const words = text.trim().split(/\s+/).length;
    return Math.max(10.0, Math.round((words / 200) * 60) + 5.0);
  };

  const generateStandaloneHtml = (article: Article, duration: number): string => {
    const rawTitle = article.title.toUpperCase().replace(/["“”«»¨]/g, '');
    const body = article.text.toUpperCase();

    // Lógica para dividir el título respetando el pipe |
    const titleParts = rawTitle.split('|').map(s => s.trim());
    let line1 = "";
    let line2 = "";

    if (titleParts.length >= 2) {
      line1 = titleParts[0];
      line2 = titleParts.slice(1).join(' '); // Por si hay más de un pipe, unimos el resto
    } else {
      // Algoritmo de balanceo por conteo de palabras si no hay pipe
      const words = rawTitle.split(' ');
      const mid = Math.ceil(words.length / 2);
      line1 = words.slice(0, mid).join(' ');
      line2 = words.slice(mid).join(' ');
    }

    const imageData = allImages.map((url, idx) => {
      const crop = imageCrops[idx] || { x: 0, y: 0, width: 100, height: 100 };
      const fS = 100 / crop.width;
      const fX = (50 - (crop.x + crop.width / 2)) * fS;
      const fY = (50 - (crop.y + crop.height / 2)) * fS;
      return { url, fS, fX, fY };
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saladillo Vivo Master Slide (Visual Only)</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;900&display=swap');
        :root { --brand-blue: #003399; }
        * { margin: 0; padding: 0; box-sizing: border-box; overflow: hidden; }
        body { background: #000; font-family: 'Inter', sans-serif; width: 100vw; height: 100vh; color: #fff; }
        .master-container { width: 100vw; height: 100vh; position: relative; background: #000; }
        
        .img-container { position: absolute; inset: 0; opacity: 0; z-index: 10; background: #000; }
        .bg-image { width: 100%; height: 100%; object-fit: cover; transform-origin: center; }
        
        .overlay { position: absolute; inset: 0; background: radial-gradient(circle, rgba(0,0,0,0) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.6) 100%); z-index: 100; pointer-events: none; }
        .progress-bar { position: absolute; width: 0%; height: 1.2vh; background: var(--brand-blue); z-index: 200; box-shadow: 0 0 15px rgba(0,51,153,0.5); }
        .progress-top { top: 0; right: 0; }
        .progress-bottom { bottom: 9.16%; left: 0; }

        .logo-area { 
            position: absolute; top: 3.61%; left: 0; height: 8.33%; z-index: 150; 
            display: inline-flex; align-items: center; padding-left: 2.5%; padding-right: calc(2rem - 25px);
            background: linear-gradient(to right, var(--brand-blue) 0%, transparent 100%); 
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            border-radius: 0 2rem 2rem 0; box-shadow: 10px 0 30px rgba(0,0,0,0.3);
        }
        .logo-img { height: 75%; filter: drop-shadow(0 0 15px rgba(0,0,0,1)); }

        .logo-bottom-progress {
            position: absolute; bottom: 0; left: 0; height: 0.6vh; background: #ff0000; width: 0%;
            filter: blur(2px); box-shadow: 0 0 10px rgba(255, 0, 0, 0.8); z-index: 160;
        }

        .title-area { 
            position: absolute; bottom: 14.52%; right: 0; width: fit-content; max-width: 85%; height: 20%; z-index: 150; 
            display: flex; flex-direction: column; justify-content: center; align-items: flex-end; 
            padding-right: calc(3.5% + 10px); padding-left: 2.5rem;
            overflow: visible; isolate: isolate;
        }
        .title-bg {
            position: absolute; inset: 0; z-index: 1;
            background: linear-gradient(to left, var(--brand-blue) 0%, transparent 100%); 
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            border-radius: 2.5rem 0 0 2.5rem; box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        }
        .title-text { 
            position: relative; z-index: 180;
            font-size: 9.4vh; font-weight: 900; font-style: italic; 
            text-transform: uppercase; line-height: 0.92; text-align: right; 
            letter-spacing: -0.02em; color: #fff; filter: drop-shadow(0 10px 25px rgba(0,0,0,1)); 
            text-shadow: 0 0 15px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,1);
            display: flex; flex-direction: column; white-space: nowrap;
            padding-right: 37px; margin-right: -27px; transform: translateX(2px);
        }
        
        .title-bottom-progress, .title-top-progress {
            position: absolute; right: 0; height: 0.6vh; background: #ff0000; width: 0%;
            filter: blur(2px); box-shadow: 0 0 10px rgba(255, 0, 0, 0.8); z-index: 160;
        }
        .title-bottom-progress { bottom: 0; }
        .title-top-progress { top: 0; }
        
        .title-red-rect {
            position: absolute; top: 0; height: 100%; 
            background: #ff0000; z-index: 5;
            filter: blur(35px);
        }
        
        .ticker-bar { position: absolute; bottom: 0; left: 0; width: 100%; height: 9.16%; background: rgba(0,0,0,0.95); z-index: 200; display: flex; align-items: center; }
        .ticker-label { width: 17.81%; height: 100%; background: var(--brand-blue); color: white; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 3.4vh; z-index: 210; }
        .ticker-scroll { flex: 1; height: 100%; position: relative; overflow: hidden; display: flex; align-items: center; }
        .ticker-text { white-space: nowrap; font-size: 4.8vh; font-weight: 900; color: white; position: absolute; left: 0; top: 50%; transform: translateY(-50%); }
        .fade-screen { position: absolute; inset: 0; background: #000; z-index: 1000; opacity: 0; pointer-events: none; }

        @keyframes title-progress {
            0% { clip-path: inset(0 0 0 100%); }
            100% { clip-path: inset(0 0 0 0%); }
        }

        @keyframes red-rect-ping-pong-1 {
            0%, 100% { left: calc(100% - 43px); }
            50% { left: 0%; }
        }

        @keyframes red-rect-ping-pong-2 {
            0%, 100% { left: calc(100% - 65px); }
            50% { left: 0%; }
        }
    </style>
</head>
<body>
    <div class="master-container">
        <div class="progress-bar progress-top" id="progTop"></div>
        <div class="progress-bar progress-bottom" id="progBottom"></div>
        
        <div id="imagesWrapper">
            ${imageData.map((img, i) => `
                <div class="img-container" id="img_${i}">
                    <img src="${img.url}" class="bg-image" id="bg_${i}">
                </div>
            `).join('')}
        </div>
        
        <div class="overlay"></div>

        <div class="logo-area" id="logoArea" style="position: absolute; left: 0; width: 25%; overflow: hidden; border-radius: 0 2.5rem 2.5rem 0;">
            <!-- Mirrored Clipping Container for Logo -->
            <div class="logo-bg-clipping" style="position: absolute; inset: 0; border-radius: 0 2.5rem 2.5rem 0; overflow: hidden; z-index: 150; -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,1) 100%); mask-image: linear-gradient(to right, rgba(0,0,0,0.1) 0%, rgba(0,0,0,1) 100%);">
                <div class="logo-bg" style="position: absolute; inset: 0; background: linear-gradient(to right, var(--brand-blue) 0%, transparent 100%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);"></div>
                
                <!-- Blue-Black-Red-White (43px) -->
                <div class="title-red-rect" style="background: #6699ff; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 4.5s ease-in-out infinite 0.1s;"></div>
                <div class="title-red-rect" style="background: #000000; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 5.1s ease-in-out infinite 0.2s;"></div>
                <div class="title-red-rect" style="background: #ff0000; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 3.9s ease-in-out infinite;"></div>
                <div class="title-red-rect" style="background: #FFFFFF; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 4.7s ease-in-out infinite 0.3s;"></div>
                
                <!-- Blue-Black-Red-White (65px) -->
                <div class="title-red-rect" style="background: #6699ff; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 6.2s ease-in-out infinite 0.4s;"></div>
                <div class="title-red-rect" style="background: #000000; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 5.8s ease-in-out infinite 0.6s;"></div>
                <div class="title-red-rect" style="background: #ff0000; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 5.4s ease-in-out infinite 0.5s;"></div>
                <div class="title-red-rect" style="background: #FFFFFF; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 6.8s ease-in-out infinite 0.7s;"></div>
            </div>

            <!-- Logo Content -->
            <div style="position: relative; z-index: 151; display: flex; align-items: center; height: 100%; padding-right: calc(2rem - 25px);">
                <div class="logo-bottom-progress" id="logoTopProg" style="top: 0; bottom: auto;"></div>
                <img src="https://pub-5b294f92f42e4cbda687d0122e15bc72.r2.dev/logos/NOTICIAS.png" class="logo-img">
                <div class="logo-bottom-progress" id="logoBottomProg"></div>
            </div>
        </div>
        
        <div class="title-area" id="titleArea">
            <div class="title-bg-clipping" style="position: absolute; inset: 0; border-radius: 2.5rem 0 0 2.5rem; overflow: hidden; z-index: 1; -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.1) 100%); mask-image: linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.1) 100%);">
                <div class="title-bg" style="position: absolute; inset: 0; background: linear-gradient(to left, var(--brand-blue) 0%, transparent 100%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);"></div>
                <!-- Blue-Black-Red-White (43px) -->
                <div class="title-red-rect" style="background: #6699ff; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 4.5s ease-in-out infinite 0.1s;"></div>
                <div class="title-red-rect" style="background: #000000; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 5.1s ease-in-out infinite 0.2s;"></div>
                <div class="title-red-rect" style="background: #ff0000; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 3.9s ease-in-out infinite;"></div>
                <div class="title-red-rect" style="background: #FFFFFF; z-index: 4; width: 43px; animation: red-rect-ping-pong-1 4.7s ease-in-out infinite 0.3s;"></div>
                
                <!-- Blue-Black-Red-White (65px) -->
                <div class="title-red-rect" style="background: #6699ff; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 6.2s ease-in-out infinite 0.4s;"></div>
                <div class="title-red-rect" style="background: #000000; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 5.8s ease-in-out infinite 0.6s;"></div>
                <div class="title-red-rect" style="background: #ff0000; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 5.4s ease-in-out infinite 0.5s;"></div>
                <div class="title-red-rect" style="background: #FFFFFF; z-index: 4; width: 65px; animation: red-rect-ping-pong-2 6.8s ease-in-out infinite 0.7s;"></div>
            </div>
            <div class="title-top-progress" id="titleTopProg" style="width: calc(100% - 2.5rem); background: linear-gradient(to left, #ff0000 0%, rgba(255,0,0,0.1) 100%);"></div>
            <div class="title-text" id="titleText"><span>${line1}</span><span>${line2}</span></div>
            <div class="title-bottom-progress" id="titleBottomProg" style="width: calc(100% - 2.5rem); background: linear-gradient(to left, #ff0000 0%, rgba(255,0,0,0.1) 100%);"></div>
        </div>
        
        <div class="ticker-bar">
            <div class="ticker-label">ÚLTIMA NOTICIA</div>
            <div class="ticker-scroll"><div class="ticker-text" id="tickerTextScroll">${body}</div></div>
        </div>
        
        <div class="fade-screen" id="fade"></div>
        ${article.audio_url ? `<audio id="slide_audio" preload="auto"><source src="${article.audio_url}" type="audio/mpeg"></audio>` : ''}
    </div>
    
    <script>
        // Sincronización con la App Principal de Saladillo ViVo (Silent Visual Mode)
        const urlParams = new URLSearchParams(window.location.search);
        
        // Reportar duración a la App inmediatamente para el control de la pauta sonora
        window.addEventListener('load', () => { 
            const duration = ${duration}; 
            window.parent.postMessage({ type: 'SET_SLIDE_DURATION', durationSeconds: duration }, '*'); 

            // Si el slide se abre directamente (no en iframe parent), intentamos reproducir el audio
            if (window.self === window.top || urlParams.get('playAudio') === 'true') {
                const audio = document.getElementById('slide_audio');
                if (audio) {
                    audio.play().catch(e => console.log('Autoplay bloqueado por el navegador:', e));
                }
            }

            startVisuals();
        });

        function emitirFinDeSlide() {
            window.parent.postMessage({ type: 'SLIDE_ENDED' }, '*');
        }



        function adjustTitleFontSize() {
            const titleText = document.getElementById('titleText');
            const titleArea = document.getElementById('titleArea');
            if (!titleText || !titleArea) return;
            const maxWidth = window.innerWidth * 0.65; 
            var currentFontSize = parseFloat(window.getComputedStyle(titleText).fontSize);
            const spans = titleText.querySelectorAll('span');
            var maxSpanWidth = 0;
            spans.forEach(function(s) { maxSpanWidth = Math.max(maxSpanWidth, s.offsetWidth); });
            if (maxSpanWidth > maxWidth) {
                var ratio = maxWidth / maxSpanWidth;
                titleText.style.fontSize = (currentFontSize * ratio) + 'px';
            }
        }

        function startVisuals() {
            adjustTitleFontSize();
            
            const duration = ${duration};
            const imagesCount = ${imageData.length};
            const timePerImage = duration / imagesCount;
            const images = ${JSON.stringify(imageData)};
            const fadeDur = Math.min(1.0, timePerImage);
            
            const tl = gsap.timeline({ onComplete: emitirFinDeSlide });
            const ticker = document.getElementById('tickerTextScroll');

            tl.fromTo(".progress-bar", { width: "0%" }, { width: "100%", duration: duration, ease: "none" }, 0);
            tl.fromTo("#titleBottomProg, #titleTopProg", { clipPath: "inset(0 0 0 100%)" }, { clipPath: "inset(0 0 0 0%)", duration: duration, ease: "none" }, 0);
            tl.fromTo("#logoBottomProg", { width: "0%" }, { width: "100%", duration: duration, ease: "none" }, 0);
            tl.fromTo("#tickerTextScroll", { x: "100vw" }, { x: -(ticker.offsetWidth + 100), duration: duration, ease: "none" }, 0);
            tl.fromTo("#titleArea", { opacity: 0, x: 100 }, { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }, 1.5);
            tl.fromTo("#titleText span", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.2, ease: "back.out(1.7)" }, 1.8);

            images.forEach((img, i) => {
                const startTime = i * timePerImage;
                
                // Configuración Inicial: Z-Index 20 para estar arriba.
                tl.set('#img_' + i, { zIndex: 20 }, startTime);
                
                // Transición: Aparecer (Fade In)
                if (i === 0) {
                    // La primera imagen ya empieza visible
                    tl.set('#img_' + i, { opacity: 1 }, startTime);
                } else {
                    // Las siguientes empiezan invisibles y hacen Fade In de 1s
                    tl.set('#img_' + i, { opacity: 0 }, startTime);
                    tl.to('#img_' + i, { opacity: 1, duration: 1.0, ease: "power1.in" }, startTime);
                }

                // Efecto Ken Burns (Movimiento)
                tl.fromTo('#bg_' + i, 
                    { scale: 1, x: "0%", y: "0%" }, 
                    { scale: img.fS, x: img.fX + '%', y: img.fY + '%', duration: timePerImage + 1.0, ease: "none" }, // Extendemos duración para cubrir el solapamiento
                    startTime
                );

                // Manejo de la imagen anterior (Fade Out o Ocultar bajo la nueva)
                if(i > 0) {
                    // Mantenemos la anterior visible mientras la nueva aparece encima.
                    // Recién la ocultamos cuando la transición termina.
                    tl.set('#img_' + (i-1), { opacity: 0, zIndex: 10 }, startTime + 1.0);
                }
            });

            tl.to("#fade", { opacity: 1, duration: 1.0 }, duration - 1.0);
        }
    </script>
</body>
</html>`;
  };

  const handleGenerateManifest = async () => {
    if (!selectedArticle) return;
    setIsGenerating(true);
    setStatusMessage('Compilando Galería Visual...');

    const finalDuration = audioReady ? audioDuration : calculateAutoDuration(selectedArticle.text);

    try {
      const htmlContent = generateStandaloneHtml(selectedArticle, finalDuration);
      const publicHtmlUrl = await uploadHtmlToR2(htmlContent, "slide_" + selectedArticle.id + "_" + Date.now() + ".html");

      await supabase.from('articles').update({
        url_slide: publicHtmlUrl,
        animation_duration: finalDuration
      }).eq('id', selectedArticle.id);

      setIsGenerating(false);
      setSuccess("Slide visual publicado.");
      fetchArticles();
    } catch (e: any) {
      setError(e.message);
      setIsGenerating(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = allImages.filter((_, i) => i !== index);
    const newCrops: Record<number, CropPercent> = {};
    Object.keys(imageCrops).forEach(k => {
      const idx = parseInt(k);
      if (idx < index) newCrops[idx] = imageCrops[idx];
      else if (idx > index) newCrops[idx - 1] = imageCrops[idx];
    });
    setAllImages(newImages);
    setImageCrops(newCrops);
    if (activeImgIndex === index) setActiveImgIndex(Math.max(0, index - 1));
    else if (activeImgIndex > index) setActiveImgIndex(activeImgIndex - 1);
  };

  const handleDeleteSlide = async () => {
    if (!selectedArticle || !selectedArticle.url_slide) return;
    const confirmDelete = window.confirm("¿Eliminar slide visual?");
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await deleteFileFromR2(selectedArticle.url_slide);
      await supabase.from('articles').update({ url_slide: null, animation_duration: null }).eq('id', selectedArticle.id);
      setSuccess("Slide eliminado.");
      fetchArticles();
    } catch (e: any) { setError(e.message); } finally { setIsDeleting(false); }
  };

  const handleDeletePublishedSlide = async (e: React.MouseEvent, article: Article) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(`¿Eliminar slide publicado de "${article.title.replace(/\|/g, ' ').substring(0, 50)}"?\n\nSe eliminará el slide, el audio y todos sus datos.`);
    if (!confirmDelete) return;
    setDeletingSlideId(article.id);
    try {
      // Eliminar slide HTML de R2
      if (article.url_slide) await deleteFileFromR2(article.url_slide);
      // Eliminar audio de R2
      if (article.audio_url) await deleteFileFromR2(article.audio_url);
      // Limpiar campos en Supabase
      await supabase.from('articles').update({
        url_slide: null,
        animation_duration: null,
        audio_url: null
      }).eq('id', article.id);
      // Si era el artículo seleccionado, actualizar estado local
      if (selectedArticle?.id === article.id) {
        setSelectedArticle(prev => prev ? { ...prev, url_slide: undefined, audio_url: undefined, animation_duration: undefined } : null);
        setAudioReady(false);
        setAudioDuration(0);
      }
      setSuccess('Slide y audio eliminados.');
      fetchArticles();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingSlideId(null);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
      <div className="lg:col-span-9 flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative">
        {(isGenerating || isDeleting) && (
          <div className="absolute inset-0 z-[150] bg-slate-900/95 flex flex-col items-center justify-center p-12 text-white text-center">
            <Loader2 size={64} className="animate-spin text-blue-500 mb-8" />
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">{isDeleting ? 'Eliminando' : 'Masterizando'}</h2>
            <p className="text-slate-500 text-sm uppercase tracking-widest font-bold animate-pulse">{statusMessage}</p>
          </div>
        )}

        {isCropping && (
          <div className="absolute inset-0 z-[200] bg-black flex flex-col">
            <div className="px-6 py-4 bg-slate-900 flex justify-between items-center text-white">
              <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <Crop size={16} className="text-blue-500" /> Encuadre Foto {activeImgIndex + 1}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setIsCropping(false)} className="px-6 py-2 bg-blue-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2">Confirmar <Check size={14} /></button>
              </div>
            </div>
            <div className="flex-1 relative">
              <Cropper
                image={allImages[activeImgIndex]}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                minZoom={1}
                restrictPosition={true}
              />
            </div>
            <div className="bg-slate-900 p-6 flex items-center gap-4 text-white">
              <ZoomIn size={16} className="text-blue-400" />
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>
          </div>
        )}

        <div className="px-8 py-5 border-b bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg"><Presentation size={24} /></div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Slide Master Visual</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Modo: Exportación Silenciosa</p>
            </div>
          </div>
          {success && (
            <div className="flex items-center gap-2 text-[10px] font-black text-green-600 bg-green-50 px-4 py-2 rounded-full animate-bounce uppercase tracking-widest border border-green-100">
              <CheckCircle2 size={14} /> {success}
            </div>
          )}
          {error && <div className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest border border-red-100">{error}</div>}
        </div>

        {selectedArticle ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-[7] bg-black relative min-h-0">
              <SlideAnimationPreview
                images={allImages}
                imageCrops={imageCrops}
                audioDuration={audioDuration || calculateAutoDuration(selectedArticle.text)}
                tickerMessages={[selectedArticle.text]}
                title={selectedArticle.title}
                className="h-full w-full"
              />
              <div className="absolute top-4 left-4 z-50 flex flex-col gap-3">
                <button onClick={() => setIsCropping(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-blue-500 transition-all">
                  <Crop size={16} /> AJUSTAR ZOOM FOTO {activeImgIndex + 1}
                </button>
                <div className="flex gap-2 bg-black/60 p-2 rounded-2xl backdrop-blur-md border border-white/10">
                  {allImages.map((img, i) => (
                    <div key={i} className="relative group/thumb">
                      <button onClick={() => setActiveImgIndex(i)} className={"w-12 h-12 rounded-lg overflow-hidden border-2 transition-all " + (activeImgIndex === i ? 'border-blue-500 scale-110' : 'border-white/20 opacity-50')}>
                        <img src={img} className="w-full h-full object-cover" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeImage(i); }} className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors opacity-0 group-hover/thumb:opacity-100 z-[60]">
                        <X size={12} strokeWidth={4} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {audioLoading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-40">
                  <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl flex items-center gap-4 border border-white/20">
                    <Loader2 className="animate-spin text-blue-400" />
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Sincronizando tiempo de audio...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-[3] flex flex-col bg-slate-50 p-6 overflow-y-auto custom-scrollbar border-l border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Code size={14} className="text-blue-500" /> Configuración Visual</h3>
              <div className="space-y-8">
                <div className="p-4 bg-white border border-blue-200 rounded-2xl">
                  <p className="text-[11px] font-black text-blue-700 uppercase leading-none">{allImages.length} Fotos</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Duración: {audioDuration.toFixed(1)}s</p>
                </div>

                <div className="pt-6 border-t border-slate-200 space-y-4">
                  <button
                    onClick={handleGenerateManifest}
                    disabled={isGenerating || audioLoading || allImages.length === 0 || isDeleting}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-30 font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all"
                  >
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                    PUBLICAR SLIDE
                  </button>

                  {selectedArticle.url_slide && (
                    <button onClick={handleDeleteSlide} disabled={isGenerating || isDeleting} className="w-full py-4 bg-red-600 text-white rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-30 font-black text-[11px] uppercase tracking-widest hover:bg-red-700 transition-all">
                      {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      ELIMINAR
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-6 opacity-30 animate-pulse">
            <MonitorPlay size={80} />
            <p className="uppercase font-black text-xs tracking-[0.5em]">Selecciona noticia para masterizar</p>
          </div>
        )}
      </div>

      <div className="lg:col-span-3 flex flex-col h-full bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center shrink-0">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-3"><LayoutList size={20} className="text-blue-600" /> Inbox</h3>
          <button onClick={fetchArticles} className="p-2.5 hover:bg-slate-200 rounded-xl transition-colors"><RefreshCw size={20} className={(loadingList ? 'animate-spin' : '') + " text-slate-400"} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
          {articles.map((article) => (
            <div key={article.id} onClick={() => setSelectedArticle(article)} className={"relative flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer group " + (selectedArticle?.id === article.id ? 'bg-white border-blue-400 ring-4 ring-blue-50 shadow-lg' : 'bg-white border-slate-100 hover:border-slate-300')}>
              <div className="w-12 h-12 shrink-0 bg-slate-100 rounded-xl overflow-hidden border border-slate-200"><img src={article.image_url} className="w-full h-full object-cover" /></div>
              <div className="flex-1 min-w-0">
                <h4 className={"text-[10px] font-black line-clamp-2 uppercase leading-tight tracking-tight " + (selectedArticle?.id === article.id ? 'text-blue-700' : 'text-slate-800')}>{article.title.replace(/\|/g, ' ')}</h4>
                <div className="flex gap-2 mt-1">
                  {article.audio_url && <span className="text-[7px] font-black text-green-600 uppercase">🎙️ AUDIO</span>}
                  {article.url_slide && <span className="text-[7px] font-black text-blue-600 uppercase">🎬 SLIDE</span>}
                </div>
              </div>
              {article.url_slide && (
                <button
                  onClick={(e) => handleDeletePublishedSlide(e, article)}
                  disabled={deletingSlideId === article.id}
                  title="Eliminar slide publicado"
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-wait shadow-sm"
                >
                  {deletingSlideId === article.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : <X size={11} strokeWidth={3} />}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
