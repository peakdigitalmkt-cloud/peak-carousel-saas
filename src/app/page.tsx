"use client";

import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Download, Sparkles, Link2, Loader2 } from 'lucide-react';

interface SlideColors {
  bg: string;
  text: string;
  accent: string;
}

interface SlideContent {
  title: string;
  subtitle: string;
  body: string;
  tag: string;
}

interface SlideVisuals {
  icon: string;
  opacity: number;
}

interface Slide {
  id: number;
  type: 'cover' | 'content' | 'cta';
  layout: 'centered' | 'split' | 'full';
  colors: SlideColors;
  content: SlideContent;
  visuals: SlideVisuals;
}

interface CarouselConfig {
  theme: string;
  primaryColor: string;
  font: string;
}

interface CarouselData {
  config: CarouselConfig;
  slides: Slide[];
}

const EMPTY_STATE: CarouselData = {
  config: { theme: '', primaryColor: '', font: '' },
  slides: [],
};

export default function Home() {
  const [asanaUrl, setAsanaUrl] = useState('');
  const [asanaToken, setAsanaToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [carousel, setCarousel] = useState<CarouselData>(EMPTY_STATE);

  const carouselRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const saved = localStorage.getItem('peak_asana_token');
    if (saved) setAsanaToken(saved);
  }, []);

  const generateCarousel = async () => {
    if (!asanaUrl) return alert('Cole a URL da tarefa do Asana primeiro.');
    if (!asanaToken) return alert('Cole seu Token de Acesso do Asana primeiro.');
    
    setIsLoading(true);
    localStorage.setItem('peak_asana_token', asanaToken);
    
    try {
      const matches = asanaUrl.match(/\/(\d+)(\/f|\/)?$/) || asanaUrl.match(/\d{5,}/g);
      const taskId = matches ? matches[matches.length - 1].replace(/\//g, '') : null;

      if (!taskId) {
        setIsLoading(false);
        return alert('URL inválida.');
      }

      const res = await fetch('/api/asana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_task', payload: { taskGid: taskId, token: asanaToken } })
      });
      
      const responseBody = await res.json();
      
      if (responseBody.error) {
        setIsLoading(false);
        return alert(responseBody.error);
      }

      const task = responseBody.data;
      if (!task) {
        setIsLoading(false);
        return alert('Tarefa não encontrada.');
      }

      const aiRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: task.notes || task.name,
          context: { taskName: task.name, projectName: task.projects?.[0]?.name || '' }
        })
      });
      
      const aiResult = await aiRes.json();
      setIsLoading(false);
      
      if (aiResult.error) {
        return alert(`Erro IA: ${aiResult.error}`);
      }
      
      if (aiResult.slides && Array.isArray(aiResult.slides)) {
        setCarousel({
          config: aiResult.config || { theme: 'Default', primaryColor: '#3b82f6', font: 'DM Sans' },
          slides: aiResult.slides,
        });
      }
    } catch (err) {
      setIsLoading(false);
      alert('Erro ao processar.');
      console.error(err);
    }
  };

  const exportCarousel = async () => {
    if (!carouselRef.current) return;
    try {
      const slides = carouselRef.current.querySelectorAll('.slide');
      for (let i = 0; i < slides.length; i++) {
        const slideEl = slides[i] as HTMLElement;
        const wrapper = slideEl.parentElement;
        if (!wrapper) continue;
        
        slideEl.style.transform = 'none';
        wrapper.style.width = '1080px';
        wrapper.style.height = '1350px';

        const dataUrl = await toPng(slideEl, { width: 1080, height: 1350, pixelRatio: 1 });
        
        slideEl.style.transform = 'scale(0.5)';
        wrapper.style.width = '540px';
        wrapper.style.height = '675px';

        const link = document.createElement('a');
        link.download = `slide_${i + 1}.png`;
        link.href = dataUrl;
        link.click();
        
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar.');
    }
  };

  const hasSlides = carousel.slides.length > 0;

  const getLayoutClass = (layout: string) => {
    switch (layout) {
      case 'centered': return 'justify-center text-center items-center';
      case 'split': return 'justify-end';
      case 'full': return 'justify-between';
      default: return '';
    }
  };

  return (
    <div className="flex w-full h-screen font-sans">
      {/* SIDEBAR */}
      <div className="w-[400px] bg-[var(--panel)] border-r border-[var(--border)] flex flex-col overflow-y-auto p-8">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Peak Carousel</h2>
            <p className="text-xs text-[var(--text-muted)]">MiniMax AI</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              <Link2 size={14} className="inline mr-1" /> Token Asana
            </label>
            <input 
              type="password"
              value={asanaToken} 
              onChange={e => setAsanaToken(e.target.value)} 
              className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--text)] px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="1/123456789..." 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              <Link2 size={14} className="inline mr-1" /> Link da Tarefa Asana
            </label>
            <input 
              value={asanaUrl} 
              onChange={e => setAsanaUrl(e.target.value)} 
              className="w-full bg-[var(--background)] border border-[var(--border)] text-[var(--text)] px-4 py-3 rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="https://app.asana.com/0/..." 
              onKeyDown={e => e.key === 'Enter' && generateCarousel()}
            />
          </div>
          
          <button 
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-none px-6 py-4 rounded-xl font-semibold text-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={generateCarousel}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Gerando com IA...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Gerar Carrossel
              </>
            )}
          </button>
        </div>

        {hasSlides && (
          <div className="mt-auto pt-8 space-y-3">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-sm text-green-400 font-medium">
                ✓ {carousel.slides.length} slides gerados
              </p>
              {carousel.config.theme && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Tema: {carousel.config.theme}
                </p>
              )}
            </div>
            
            <button 
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black border-none px-6 py-4 rounded-xl font-semibold text-sm transition-all active:scale-95 cursor-pointer"
              onClick={exportCarousel}
            >
              <Download size={18} /> Exportar PNGs
            </button>
            
            <button 
              className="w-full text-sm text-[var(--text-muted)] hover:text-[var(--text)] underline transition-colors"
              onClick={() => { setCarousel(EMPTY_STATE); setAsanaUrl(''); }}
            >
              Gerar novo carrossel
            </button>
          </div>
        )}
      </div>

      {/* PREVIEW AREA */}
      <div className="flex-1 overflow-auto p-12 bg-[#1a1a1a]">
        {!hasSlides ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
              <Sparkles size={32} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
              Cole o link do Asana
            </h3>
            <p className="text-[var(--text-muted)] max-w-md">
              O MiniMax AI vai ler a tarefa, criar o design system e gerar o carrossel completo.
            </p>
          </div>
        ) : (
          <div className="flex gap-10" ref={carouselRef}>
            {carousel.slides.map((slide, idx) => {
              const isLast = idx === carousel.slides.length - 1;
              const progressPct = ((idx + 1) / carousel.slides.length) * 100;
              const layoutClass = getLayoutClass(slide.layout);
              
              return (
                <div key={idx} className="relative shrink-0 w-[540px] h-[675px] rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                  <div 
                    className={`slide flex flex-col p-20 ${layoutClass}`}
                    style={{ 
                      transform: 'scale(0.5)', 
                      transformOrigin: 'top left',
                      backgroundColor: slide.colors.bg,
                      color: slide.colors.text,
                      fontFamily: carousel.config.font,
                      width: '1080px',
                      height: '1350px',
                      position: 'absolute',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Visual Element */}
                    {slide.visuals.opacity > 0 && (
                      <div 
                        className="absolute w-[500px] h-[500px] rounded-full"
                        style={{ 
                          background: slide.colors.accent,
                          top: '5%',
                          right: '-15%',
                          opacity: slide.visuals.opacity,
                          filter: 'blur(80px)'
                        }}
                      />
                    )}
                    
                    {/* Content */}
                    <div className="relative z-10">
                      {slide.content.tag && (
                        <span 
                          className="text-sm font-bold tracking-[4px] uppercase mb-8 block"
                          style={{ color: slide.colors.accent }}
                        >
                          {slide.content.tag}
                        </span>
                      )}
                      
                      <h2 
                        className="font-bold mb-6 whitespace-pre-wrap"
                        style={{ 
                          fontSize: slide.type === 'cover' ? '72px' : '56px',
                          lineHeight: 1.1,
                          letterSpacing: '-1px'
                        }}
                      >
                        {slide.content.title}
                      </h2>
                      
                      {slide.content.subtitle && (
                        <p 
                          className="text-xl mb-4 opacity-80"
                          style={{ fontSize: '24px' }}
                        >
                          {slide.content.subtitle}
                        </p>
                      )}
                      
                      {slide.content.body && (
                        <p 
                          className="opacity-70 leading-relaxed"
                          style={{ fontSize: '20px', maxWidth: '700px' }}
                        >
                          {slide.content.body}
                        </p>
                      )}
                    </div>
                    
                    {/* CTA Button */}
                    {slide.type === 'cta' && (
                      <div 
                        className="mt-12 inline-flex items-center gap-3 px-10 py-5 rounded-full font-semibold text-lg relative z-10"
                        style={{ 
                          backgroundColor: slide.colors.accent,
                          color: slide.colors.bg
                        }}
                      >
                        Agendar via WhatsApp →
                      </div>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 px-10 py-6 flex items-center gap-4">
                      <div 
                        className="flex-1 h-1 rounded-full overflow-hidden"
                        style={{ backgroundColor: `${slide.colors.text}15` }}
                      >
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${progressPct}%`,
                            backgroundColor: slide.colors.accent
                          }}
                        />
                      </div>
                      <span 
                        className="text-xs font-medium opacity-50"
                      >
                        {idx + 1}/{carousel.slides.length}
                      </span>
                    </div>
                    
                    {/* Swipe Arrow */}
                    {!isLast && (
                      <div 
                        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(to right, transparent, ${slide.colors.text}08)`,
                          color: `${slide.colors.text}40`
                        }}
                      >
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
