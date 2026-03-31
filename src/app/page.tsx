"use client";

import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Download, Sparkles, Link2, Loader2 } from 'lucide-react';

interface Feature {
  title: string;
  desc: string;
}

interface Slide {
  tag: string;
  title: string;
  desc: string;
  component?: 'quote-box' | 'feature-list' | 'glass-card' | 'pills' | 'cta';
  features?: Feature[];
  pills?: string[];
  quote?: string;
  quoteTag?: string;
}

interface CarouselData {
  brandName: string;
  slides: Slide[];
}

const EMPTY_STATE: CarouselData = {
  brandName: '',
  slides: [],
};

export default function Home() {
  const [asanaUrl, setAsanaUrl] = useState('');
  const [asanaToken, setAsanaToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [carousel, setCarousel] = useState<CarouselData>(EMPTY_STATE);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Load token from localStorage
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
      // Extract task ID from URL
      const matches = asanaUrl.match(/\/(\d+)(\/f|\/)?$/) || asanaUrl.match(/\d{5,}/g);
      const taskId = matches ? matches[matches.length - 1].replace(/\//g, '') : null;

      if (!taskId) {
        setIsLoading(false);
        return alert('URL inválida. Não foi possível encontrar o ID da tarefa do Asana.');
      }

      // Fetch task from Asana
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

      // Generate with AI
      const aiRes = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: task.notes || task.name,
          context: {
            taskName: task.name,
            projectName: task.projects?.[0]?.name || '',
          }
        })
      });
      
      const aiResult = await aiRes.json();
      setIsLoading(false);
      
      if (aiResult.error) {
        return alert(`Erro IA: ${aiResult.error}`);
      }
      
      if (aiResult.slides && Array.isArray(aiResult.slides)) {
        setCarousel({
          brandName: aiResult.brandName || task.name.split(' - ')[0] || 'Peak MKT',
          slides: aiResult.slides,
        });
      }
    } catch (err) {
      setIsLoading(false);
      alert('Erro ao processar. Verifique o console.');
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
            <p className="text-xs text-[var(--text-muted)]">Powered by AI</p>
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
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {carousel.brandName}
              </p>
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
      <div className="flex-1 overflow-auto p-12 bg-black/40">
        {!hasSlides ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
              <Sparkles size={32} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
              Cole o link do Asana
            </h3>
            <p className="text-[var(--text-muted)] max-w-md">
              A IA vai ler a tarefa, organizar o conteúdo e gerar o carrossel completo automaticamente.
            </p>
          </div>
        ) : (
          <div className="flex gap-10" ref={carouselRef}>
            {carousel.slides.map((slide, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === carousel.slides.length - 1;
              const progressPct = ((idx + 1) / carousel.slides.length) * 100;
              
              const slidePattern = ['slide-gradient', 'slide-dark', 'slide-gradient', 'slide-light', 'slide-dark', 'slide-light', 'slide-gradient'];
              const slideClass = slidePattern[idx % slidePattern.length];
              const alignClass = isFirst ? 'slide-bottom' : isLast ? 'slide-center' : '';
              
              return (
                <div key={idx} className="relative shrink-0 w-[540px] h-[675px] rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black overflow-hidden">
                  <div 
                    className={`slide ${slideClass} ${alignClass}`}
                    style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
                  >
                    {/* Watermark */}
                    <div className="watermark" />
                    
                    {/* Logo */}
                    <div className="slide-logo" style={isLast ? { position: 'relative', top: 0, left: 0, justifyContent: 'center', marginBottom: 60 } : {}}>
                      <div className="logo-circle">
                        <span className="logo-initial">{carousel.brandName.charAt(0)}</span>
                      </div>
                      <div className="logo-text">{carousel.brandName}</div>
                    </div>
                    
                    {/* Content */}
                    <div style={isFirst ? {} : { marginTop: 'auto', marginBottom: 20 }}>
                      <span className="slide-tag">{slide.tag}</span>
                      <h2 className="slide-title whitespace-pre-wrap">{slide.title}</h2>
                      <p className="slide-content-text max-w-[800px]">{slide.desc}</p>
                    </div>
                    
                    {/* Quote Box */}
                    {slide.component === 'quote-box' && (
                      <div className="quote-box">
                        <p className="quote-tag">{slide.quoteTag || 'Destaque'}</p>
                        <p className="quote-text">&ldquo;{slide.quote || 'Citação aqui'}&rdquo;</p>
                      </div>
                    )}
                    
                    {/* Feature List */}
                    {slide.component === 'feature-list' && slide.features && (
                      <div className="feature-list" style={{ marginTop: 60 }}>
                        {slide.features.map((f, fi) => (
                          <div key={fi} className="feature-item">
                            <div className="feature-icon">{String(fi + 1).padStart(2, '0')}</div>
                            <div>
                              <div className="feature-title">{f.title}</div>
                              <div className="feature-desc">{f.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Glass Card */}
                    {slide.component === 'glass-card' && slide.pills && (
                      <div className="glass-card" style={{ padding: 40 }}>
                        {slide.pills.map((p, pi) => (
                          <span key={pi} className="pill">{p}</span>
                        ))}
                      </div>
                    )}
                    
                    {/* CTA */}
                    {slide.component === 'cta' && (
                      <div className="cta-button">
                        Agendar via WhatsApp →
                      </div>
                    )}
                    
                    {/* Progress Bar */}
                    <div className="progress-bar">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                      </div>
                      <span className="progress-label">{idx + 1}/{carousel.slides.length}</span>
                    </div>
                    
                    {/* Swipe Arrow */}
                    {!isLast && (
                      <div className="swipe-arrow">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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
