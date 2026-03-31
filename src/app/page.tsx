"use client";

import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Download, Upload, BriefcaseMedical, CheckCircle2, Link2, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';

interface Slide {
  tag: string;
  title: string;
  desc: string;
}

interface CarouselData {
  logo: string;
  logoData: string;
  brandName: string;
  colorPrimary: string;
  colorLight: string;
  colorDark: string;
  heroPhoto: string;
  slides: Slide[];
}

const DEFAULT_SLIDES: Slide[] = [
  { tag: 'GANCHO', title: 'Título Principal', desc: 'Breve descrição de apoio para retenção.' },
  { tag: 'PROBLEMA', title: 'O problema', desc: 'Explicação detalhada da dor.' },
  { tag: 'SOLUÇÃO', title: 'A resposta', desc: 'O que resolve o problema.' },
  { tag: 'RECUROS', title: 'O que você recebe', desc: 'Lista de features e benefícios.' },
  { tag: 'DETALHES', title: 'Profundidade', desc: 'Personalização e diferenciais.' },
  { tag: 'COMO FUNCIONA', title: 'Passo a passo', desc: 'Fluxo de trabalho.' },
  { tag: 'CTA', title: 'Chamada para ação', desc: 'último slide com CTA claro.' },
];

export default function Home() {
  const [asanaUrl, setAsanaUrl] = useState('');
  const [asanaToken, setAsanaToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [totalTabs, setTotalTabs] = useState(1);

  React.useEffect(() => {
    const saved = localStorage.getItem('peak_asana_token');
    if (saved) setAsanaToken(saved);
  }, []);

  const [data, setData] = useState<CarouselData>({
    logo: '',
    logoData: '',
    brandName: 'Peak MKT',
    colorPrimary: '#1e3a5f',
    colorLight: '#8ed0f0',
    colorDark: '#091a24',
    heroPhoto: '',
    slides: [...DEFAULT_SLIDES],
  });

  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slideCount = data.slides.length;
    const tabs = Math.ceil(slideCount / 2);
    setTotalTabs(tabs);
    if (activeTab >= tabs) setActiveTab(Math.max(0, tabs - 1));
  }, [data.slides.length]);

  const fetchAsanaTask = async () => {
    if (!asanaUrl) return alert('Cole a URL da tarefa do Asana primeiro.');
    setIsLoading(true);
    try {
      // Tenta extrair o ID da tarefa da URL do asana
      const matches = asanaUrl.match(/\/(\d+)(\/f|\/)?$/) || asanaUrl.match(/\d{5,}/g);
      const taskId = matches ? matches[matches.length - 1].replace(/\//g, '') : null;

      if (!taskId) {
        setIsLoading(false);
        return alert('URL inválida. Não foi possível encontrar o ID da tarefa do Asana.');
      }

      if (!asanaToken) {
        setIsLoading(false);
        return alert('Cole seu Token de Acesso do Asana no campo abaixo primeiro.');
      }
      localStorage.setItem('peak_asana_token', asanaToken);

      const res = await fetch('/api/asana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_task', payload: { taskGid: taskId, token: asanaToken } })
      });
      const responseBody = await res.json();
      setIsLoading(false);

      if (responseBody.error) {
        return alert(responseBody.error);
      }

      const task = responseBody.data;
      if (!task) return alert('Tarefa não encontrada.');

      // Parse description to extract slides
      const notes = task.notes || '';
      const lines = notes.split('\n').filter((l: string) => l.trim());
      
      // Extract slide info from description
      let extractedSlides: Slide[] = [];
      if (lines.length > 0) {
        // First line is title
        const title = task.name;
        const desc = lines.slice(0, 3).join('\n');
        
        // Try to parse structured content
        extractedSlides = [
          { tag: 'GANCHO', title, desc },
          ...lines.slice(1, 7).map((line: string, i: number) => ({
            tag: `SLIDE ${i + 2}`,
            title: line.substring(0, 50),
            desc: line,
          }))
        ];
      }
      
      setData({
        ...data,
        brandName: task.name.split(' - ')[0] || 'Peak MKT',
        slides: extractedSlides.length > 0 ? extractedSlides : [...DEFAULT_SLIDES],
      });
      setIsConnected(true);

    } catch (err) {
      setIsLoading(false);
      alert('Erro ao se conectar ao Asana proxy.');
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
      alert('Erro ao exportar gerado. Verifique o console.');
    }
  };

  const themeVars = {
    '--brand-primary': data.colorPrimary,
    '--brand-light': data.colorLight,
    '--brand-dark': data.colorDark,
  } as React.CSSProperties;

  return (
    <div className="flex w-full h-screen font-sans">
      {/* SIDEBAR WIZARD */}
      <div className="w-[450px] bg-[var(--panel)] border-r border-[var(--border)] flex flex-col overflow-y-auto p-8">
        <h2 className="flex items-center gap-3 text-2xl font-bold mb-8">
          <BriefcaseMedical className="text-[var(--accent)]" /> Peak SaaS
        </h2>

        {!isConnected ? (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mt-4">1. Importar Contexto</h3>
            <div className="p-5 bg-[var(--background)] border border-[var(--border)] rounded-xl">
              <label className="peak-ui-label flex items-center gap-2 mb-3">
                <Link2 size={16} /> Token de Acesso Asana
              </label>
              <input 
                type="password"
                value={asanaToken} 
                onChange={e => setAsanaToken(e.target.value)} 
                className="peak-ui-input mb-4" 
                placeholder="1/123456789..." 
              />
              
              <label className="peak-ui-label flex items-center gap-2 mb-3">
                <Link2 size={16} /> Link da Tarefa Asana
              </label>
              <input 
                value={asanaUrl} 
                onChange={e => setAsanaUrl(e.target.value)} 
                className="peak-ui-input mb-4" 
                placeholder="https://app.asana.com/0/..." 
              />
              <button 
                className="peak-ui-button w-full" 
                onClick={fetchAsanaTask}
                disabled={isLoading}
              >
                {isLoading ? 'Puxando inteligência...' : 'Carregar Dados da Tarefa'}
              </button>
            </div>
            
            <div className="text-center mt-6">
              <span className="text-[var(--text-muted)] text-sm">Ou preencha o estúdio manualmente</span><br/>
              <button className="text-[var(--accent)] text-sm underline mt-2" onClick={() => setIsConnected(true)}>Entrar no Estúdio Vazio</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <button className="text-sm text-[var(--accent)] underline mb-4 flex items-center gap-1" onClick={() => setIsConnected(false)}>
              Trocar Tarefa Asana
            </button>
            
            <div className="p-4 bg-[var(--background)] border border-green-900/40 rounded-lg flex items-center gap-3">
              <CheckCircle2 className="text-green-500 shrink-0" />
              <span className="text-sm text-[var(--text-muted)]">O estúdio está pronto. Preencha os assets e rode a exportação visual.</span>
            </div>

            {/* Configurações Globais */}
            <div className="bg-[var(--background)] border border-[var(--border)] p-5 rounded-lg">
              <h3 className="text-[13px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-4">Branding</h3>
              <div className="space-y-4">
                <div>
                  <label className="peak-ui-label">Nome da Marca</label>
                  <input value={data.brandName} onChange={e => setData({...data, brandName: e.target.value})} className="peak-ui-input" />
                </div>
                <div>
                  <label className="peak-ui-label">Paleta (Dominante / Clara / Escura)</label>
                  <div className="flex gap-2">
                    <input type="color" value={data.colorPrimary} onChange={e => setData({...data, colorPrimary: e.target.value})} className="h-10 w-full rounded cursor-pointer border-0 p-0" />
                    <input type="color" value={data.colorLight} onChange={e => setData({...data, colorLight: e.target.value})} className="h-10 w-full rounded cursor-pointer border-0 p-0" />
                    <input type="color" value={data.colorDark} onChange={e => setData({...data, colorDark: e.target.value})} className="h-10 w-full rounded cursor-pointer border-0 p-0" />
                  </div>
                </div>
                <div>
                  <label className="peak-ui-label">Upload da Logo (PNG)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)] cursor-pointer"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setData({...data, logo: ev.target?.result as string});
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Slides Editor com abas dinâmicas */}
            <div className="bg-[var(--background)] border border-[var(--border)] p-5 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[13px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Textos do Carrossel</h3>
                <button 
                  onClick={() => setData({...data, slides: [...data.slides, { tag: 'SLIDE', title: 'Novo Slide', desc: 'Descrição' }]})}
                  className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  <Plus size={14} /> Adicionar Slide
                </button>
              </div>
              
              {/* Abas dinâmicas */}
              {totalTabs > 1 && (
                <div className="flex items-center gap-1 mb-4 border-b border-[var(--border)] pb-2">
                  {Array.from({ length: totalTabs }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveTab(i)}
                      className={`px-3 py-1.5 text-xs rounded transition-colors ${
                        activeTab === i 
                          ? 'bg-[var(--accent)] text-white' 
                          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      Slides {i * 2 + 1}-{Math.min(i * 2 + 2, data.slides.length)}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="space-y-4">
                {data.slides.slice(activeTab * 2, activeTab * 2 + 2).map((slide, idx) => {
                  const globalIdx = activeTab * 2 + idx;
                  return (
                    <div key={globalIdx} className="border border-[var(--border)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-[var(--accent)]">Slide {globalIdx + 1}</span>
                        {data.slides.length > 2 && (
                          <button 
                            onClick={() => {
                              const newSlides = data.slides.filter((_, i) => i !== globalIdx);
                              setData({...data, slides: newSlides});
                            }}
                            className="text-[var(--text-muted)] hover:text-red-400"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="peak-ui-label text-xs">Tag</label>
                          <input 
                            value={slide.tag} 
                            onChange={e => {
                              const newSlides = [...data.slides];
                              newSlides[globalIdx] = {...slide, tag: e.target.value};
                              setData({...data, slides: newSlides});
                            }} 
                            className="peak-ui-input text-sm" 
                          />
                        </div>
                        <div>
                          <label className="peak-ui-label text-xs">Título</label>
                          <textarea 
                            value={slide.title} 
                            onChange={e => {
                              const newSlides = [...data.slides];
                              newSlides[globalIdx] = {...slide, title: e.target.value};
                              setData({...data, slides: newSlides});
                            }} 
                            className="peak-ui-input h-16 resize-none text-sm" 
                          />
                        </div>
                        <div>
                          <label className="peak-ui-label text-xs">Descrição</label>
                          <textarea 
                            value={slide.desc} 
                            onChange={e => {
                              const newSlides = [...data.slides];
                              newSlides[globalIdx] = {...slide, desc: e.target.value};
                              setData({...data, slides: newSlides});
                            }} 
                            className="peak-ui-input h-20 resize-none text-sm" 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* MAIN CONTENT PREVIEW */}
      <div className="flex-1 flex flex-col bg-[var(--background)] overflow-hidden relative border-l border-[var(--border)]">
        <div className="h-20 border-b border-[var(--border)] px-10 flex items-center justify-between z-10 bg-[var(--background)]">
          <div>
            <h1 className="text-[18px] font-bold">Preview Editorial</h1>
            <p className="text-[var(--text-muted)] text-[13px]">Resolução de exportação: 1080x1350px por slide.</p>
          </div>
          {isConnected && (
            <button className="peak-ui-button" onClick={exportCarousel}>
              <Download size={18} /> Baixar Imagens Finais
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-12 bg-black/40">
          {!isConnected ? (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-lg">
              Insira o link Asana para visualização em tempo real.
            </div>
          ) : (
            <div className="flex gap-10" ref={carouselRef} style={themeVars}>
              {data.slides.map((slide, idx) => {
                const isLight = idx % 2 === 0;
                const isLast = idx === data.slides.length - 1;
                const progressPct = ((idx + 1) / data.slides.length) * 100;
                
                return (
                  <div key={idx} className="slide-wrapper relative w-[540px] h-[675px] shrink-0 overflow-hidden shadow-2xl rounded-sm">
                    <div 
                      className={`slide ${isLight ? 'slide-light' : 'slide-dark'} ${idx === 0 ? 'slide-bottom' : ''}`} 
                      style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
                    >
                      {idx === 0 && data.heroPhoto && (
                        <>
                          <div className="photo-mask" style={{ backgroundImage: `url(${data.heroPhoto})` }} />
                          <div className={`photo-overlay-${isLight ? 'light' : 'dark'}`} />
                        </>
                      )}
                      
                      {data.logo && <div className="watermark" style={{ backgroundImage: `url(${data.logo})` }} />}
                      
                      <div className="slide-logo">
                        <div 
                          className="logo-circle" 
                          style={{ 
                            backgroundImage: data.logo ? `url(${data.logo})` : 'none',
                            backgroundColor: data.logo ? 'transparent' : data.colorPrimary
                          }} 
                        >
                          {!data.logo && <span className="logo-initial">{data.brandName.charAt(0)}</span>}
                        </div>
                        <div className="logo-text">{data.brandName}</div>
                      </div>
                      
                      <span className="slide-tag">{slide.tag}</span>
                      <h2 className="slide-title whitespace-pre-wrap">{slide.title}</h2>
                      <p className="slide-text max-w-[800px] leading-relaxed">{slide.desc}</p>
                      
                      {/* Barra de Progresso */}
                      <div className="progress-bar">
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="progress-label">{idx + 1}/{data.slides.length}</span>
                      </div>
                      
                      {/* Seta de Arraste (não mostra no último slide) */}
                      {!isLast && (
                        <div className="swipe-arrow">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
    </div>
  );
}
