"use client";

import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Download, Upload, BriefcaseMedical, CheckCircle2, Link2, ChevronLeft, ChevronRight, Plus, X, Sparkles } from 'lucide-react';

interface Feature {
  title: string;
  desc: string;
}

interface Slide {
  tag: string;
  title: string;
  desc: string;
  photo?: string;
  component?: 'quote-box' | 'feature-list' | 'glass-card' | 'pills' | 'cta';
  features?: Feature[];
  pills?: string[];
  quote?: string;
  quoteTag?: string;
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
  const [savedImages, setSavedImages] = useState<{logo: string[], photos: string[]}>({ logo: [], photos: [] });
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem('peak_asana_token');
    if (saved) setAsanaToken(saved);
    
    const savedImgs = localStorage.getItem('peak_saved_images');
    if (savedImgs) {
      try {
        setSavedImages(JSON.parse(savedImgs));
      } catch {}
    }
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

  const saveImageToStorage = (type: 'logo' | 'photos', imageData: string) => {
    const newImages = { ...savedImages };
    if (type === 'logo') {
      newImages.logo = [imageData, ...newImages.logo.filter(i => i !== imageData)].slice(0, 10);
    } else {
      newImages.photos = [imageData, ...newImages.photos.filter(i => i !== imageData)].slice(0, 20);
    }
    setSavedImages(newImages);
    localStorage.setItem('peak_saved_images', JSON.stringify(newImages));
  };

  const generateWithAI = async (text: string) => {
    setIsAiGenerating(true);
    
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const result = await res.json();
      setIsAiGenerating(false);
      
      if (result.error) {
        console.error('Erro IA:', result.error);
        return null;
      }
      
      return result.slides || result;
    } catch (err) {
      setIsAiGenerating(false);
      console.error('Erro ao conectar com a API Gemini:', err);
      return null;
    }
  };

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

      // Try AI generation first
      const aiSlides = await generateWithAI(task.notes || task.name);
      if (aiSlides && Array.isArray(aiSlides)) {
        setData({
          ...data,
          brandName: task.name.split(' - ')[0] || 'Peak MKT',
          slides: aiSlides,
        });
        setIsConnected(true);
        return;
      }
      
      // Fallback: manual parsing
      const notes = task.notes || '';
      
      // Clean up notes - remove common prefixes/labels
      const cleanNotes = notes
        .replace(/^(Título:|TITULO:|Titulo:)\s*/gim, '')
        .replace(/^(Subtítulo:|SUBTITULO:|Subtitulo:)\s*/gim, '')
        .replace(/^(Descrição:|DESCRIÇÃO:|Descricao:)\s*/gim, '')
        .replace(/^(Slide \d+:|SLIDE \d+:)\s*/gi, '');
      
      // Try to find structured format or split by paragraphs
      const paragraphs = cleanNotes.split(/\n\n+/).filter((p: string) => p.trim());
      const lines = cleanNotes.split('\n').filter((l: string) => l.trim());
      
      let extractedSlides: Slide[] = [];
      
      if (paragraphs.length >= 2) {
        // Multiple paragraphs = multiple slides
        extractedSlides = paragraphs.slice(0, 10).map((p: string, i: number) => {
          const cleanContent = p
            .replace(/^(Slide \d+:|SLIDE \d+:|^\d+\.)\s*/gi, '')
            .replace(/^(Título:|TITULO:|Titulo:)\s*/gim, '')
            .replace(/^(Subtítulo:|SUBTITULO:|Subtitulo:)\s*/gim, '');
          
          const contentLines = cleanContent.split('\n');
          const title = contentLines[0]?.substring(0, 60) || (i === 0 ? 'Gancho' : `Slide ${i + 1}`);
          const subtitle = contentLines.slice(1).join(' ').substring(0, 200) || contentLines[0] || '';
          
          return { 
            tag: i === 0 ? 'GANCHO' : `SLIDE ${i + 1}`, 
            title, 
            desc: subtitle 
          };
        });
      } else if (lines.length >= 2) {
        // Single paragraph with multiple lines = multiple slides
        extractedSlides = lines.slice(0, 10).map((line: string, i: number) => {
          const cleanLine = line
            .replace(/^(Slide \d+:|SLIDE \d+:|^\d+\.)\s*/gi, '')
            .replace(/^(Título:|TITULO:|Titulo:)\s*/gim, '')
            .replace(/^(Subtítulo:|SUBTITULO:|Subtitulo:)\s*/gim, '')
            .trim();
          
          return { 
            tag: i === 0 ? 'GANCHO' : `SLIDE ${i + 1}`, 
            title: cleanLine.substring(0, 60), 
            desc: cleanLine 
          };
        });
      }
      
      // If nothing extracted, use default
      if (extractedSlides.length === 0) {
        const firstLine = lines[0] || '';
        const rest = lines.slice(1).join(' ').substring(0, 200);
        extractedSlides = [
          { tag: 'GANCHO', title: task.name, desc: rest || firstLine },
          { tag: 'PROBLEMA', title: 'O problema', desc: 'Descreva o problema...' },
          { tag: 'SOLUÇÃO', title: 'A solução', desc: 'Como resolver...' },
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
                  <label className="peak-ui-label">Logo da Marca</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="w-full text-xs text-[var(--text-muted)] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent)] file:text-white hover:file:bg-[var(--accent-hover)] cursor-pointer"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const imgData = ev.target?.result as string;
                              setData({...data, logo: imgData});
                              saveImageToStorage('logo', imgData);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      {/* Galeria de logos salvos */}
                      {savedImages.logo.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {savedImages.logo.slice(0, 5).map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setData({...data, logo: img})}
                              className="w-10 h-10 rounded border border-[var(--border)] overflow-hidden hover:border-[var(--accent)] transition-colors"
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="peak-ui-label">Fotos do Carrossel</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="w-full text-xs text-[var(--text-muted)] file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--border)] file:text-white hover:file:bg-[var(--text-muted)] cursor-pointer"
                        onChange={e => {
                          const files = e.target.files;
                          if (files) {
                            Array.from(files).forEach(file => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const imgData = ev.target?.result as string;
                                setData({...data, heroPhoto: imgData});
                                saveImageToStorage('photos', imgData);
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                      />
                      {/* Galeria de fotos salvas */}
                      {savedImages.photos.length > 0 && (
                        <div className="mt-2 flex gap-1 flex-wrap">
                          {savedImages.photos.slice(0, 8).map((img, i) => (
                            <button
                              key={i}
                              onClick={() => setData({...data, heroPhoto: img})}
                              className="w-10 h-10 rounded border border-[var(--border)] overflow-hidden hover:border-[var(--accent)] transition-colors"
                            >
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
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
                          <label className="peak-ui-label text-xs">Subtítulo</label>
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
                const isFirst = idx === 0;
                const isLast = idx === data.slides.length - 1;
                const progressPct = ((idx + 1) / data.slides.length) * 100;
                
                // Padrão Dr Roberto: gradient, dark, gradient, light, dark, light, gradient
                const getSlideClass = () => {
                  const slidePattern = ['slide-gradient', 'slide-dark', 'slide-gradient', 'slide-light', 'slide-dark', 'slide-light', 'slide-gradient'];
                  const patternIdx = idx % slidePattern.length;
                  return slidePattern[patternIdx];
                };
                
                const getAlign = () => {
                  if (isFirst) return 'slide-bottom';
                  if (isLast) return 'slide-center';
                  return '';
                };
                
                const slideClass = getSlideClass();
                
                return (
                  <div key={idx} className="relative shrink-0 w-[540px] h-[675px] rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black overflow-hidden">
                    <div 
                      className={`slide ${slideClass} ${getAlign()}`} 
                      style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}
                    >
                      {/* Photo Mask (Hero e último slide) */}
                      {data.heroPhoto && (isFirst || isLast) && (
                        <>
                          <div className="photo-mask" style={{ backgroundImage: `url(${data.heroPhoto})` }} />
                          <div className="photo-overlay-dark" />
                        </>
                      )}
                      
                      {/* Watermark */}
                      {data.logo && <div className="watermark" style={{ backgroundImage: `url(${data.logo})` }} />}
                      
                      {/* Logo (primeiro slide ou CTA) */}
                      {(isFirst || isLast) && (
                        <div className="slide-logo" style={isLast ? { position: 'relative', top: 0, left: 0, justifyContent: 'center', marginBottom: 60 } : {}}>
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
                      )}
                      
                      {/* Logo para slides do meio */}
                      {!isFirst && !isLast && (
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
                          <div className="logo-text">{idx + 1}. {slide.tag}</div>
                        </div>
                      )}
                      
                      {/* Conteúdo principal */}
                      <div style={isFirst ? {} : { marginTop: 'auto', marginBottom: 20 }}>
                        <span className="slide-tag">{slide.tag}</span>
                        <h2 className="slide-title whitespace-pre-wrap">{slide.title}</h2>
                        <p className="slide-content-text max-w-[800px]">{slide.desc}</p>
                      </div>
                      
                      {/* Componentes dinâmicos do slide */}
                      {slide.component === 'quote-box' && (
                        <div className="quote-box">
                          <p className="quote-tag">{slide.quoteTag || 'Destaque'}</p>
                          <p className="quote-text">"{slide.quote || 'Insira uma citação aqui...'}"</p>
                        </div>
                      )}
                      
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
                      
                      {slide.component === 'glass-card' && slide.pills && (
                        <div className="glass-card" style={{ padding: 40 }}>
                          {slide.pills.map((p, pi) => (
                            <span key={pi} className="pill">{p}</span>
                          ))}
                        </div>
                      )}
                      
                      {slide.component === 'cta' && (
                        <div className="cta-button">
                          Agendar via WhatsApp →
                        </div>
                      )}
                      
                      {/* Fallback: quote box hardcoded para slide 2 se não tem componente */}
                      {!slide.component && idx === 1 && (
                        <div className="quote-box">
                          <p className="quote-tag">Sinais de alerta</p>
                          <p className="quote-text">"Sua resposta pode estar aqui..."</p>
                        </div>
                      )}
                      
                      {/* Fallback: feature list hardcoded */}
                      {!slide.component && (idx === 3 || idx === 5) && (
                        <div className="feature-list" style={{ marginTop: 60 }}>
                          <div className="feature-item">
                            <div className="feature-icon">{idx === 5 ? '👁️' : '01'}</div>
                            <div>
                              <div className="feature-title">Primeiro Item</div>
                              <div className="feature-desc">Descrição do primeiro item.</div>
                            </div>
                          </div>
                          <div className="feature-item">
                            <div className="feature-icon">{idx === 5 ? '⏱️' : '02'}</div>
                            <div>
                              <div className="feature-title">Segundo Item</div>
                              <div className="feature-desc">Descrição do segundo item.</div>
                            </div>
                          </div>
                          <div className="feature-item">
                            <div className="feature-icon">{idx === 5 ? '🏠' : '03'}</div>
                            <div>
                              <div className="feature-title">Terceiro Item</div>
                              <div className="feature-desc">Descrição do terceiro item.</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Fallback: glass card hardcoded */}
                      {!slide.component && idx === 4 && (
                        <div className="glass-card" style={{ padding: 40 }}>
                          <span className="pill">Opção 1</span>
                          <span className="pill">Opção 2</span>
                          <span className="pill">Opção 3</span>
                        </div>
                      )}
                      
                      {/* CTA Button (último slide) */}
                      {isLast && !slide.component && (
                        <div className="cta-button">
                          Agendar via WhatsApp →
                        </div>
                      )}
                      
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
    </div>
  );
}
