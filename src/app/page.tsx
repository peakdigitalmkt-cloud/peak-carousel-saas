"use client";

import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Download, Upload, BriefcaseMedical, CheckCircle2, Link2 } from 'lucide-react';

export default function Home() {
  const [asanaUrl, setAsanaUrl] = useState('');
  const [asanaToken, setAsanaToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Load token from local storage on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('peak_asana_token');
    if (saved) setAsanaToken(saved);
  }, []);

  // Carousel Data
  const [data, setData] = useState({
    logo: '',
    brandName: 'Peak MKT',
    colorPrimary: '#1e3a5f',
    colorLight: '#8ed0f0',
    colorDark: '#091a24',
    heroPhoto: '',
    heroTag: 'GANCHO',
    heroTitle: 'Título Principal',
    heroDesc: 'Breve descrição de apoio para retenção.',
    slide2Tag: 'PROBLEMA',
    slide2Title: 'O problema',
    slide2Desc: 'Explicação detalhada da dor.',
  });

  const carouselRef = useRef<HTMLDivElement>(null);

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

      setData({
        ...data,
        heroTitle: task.name,
        heroDesc: task.notes?.split('\n')[0] || 'Descrição extraída da tarefa',
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
                      if (e.target.files?.[0]) setData({...data, logo: URL.createObjectURL(e.target.files[0])});
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Slides Editor */}
            <div className="bg-[var(--background)] border border-[var(--border)] p-5 rounded-lg">
              <h3 className="text-[13px] uppercase tracking-wider font-bold text-[var(--text-muted)] mb-4">Textos do Carrossel</h3>
              <div className="space-y-4">
                <div>
                  <label className="peak-ui-label">Capa: Tag</label>
                  <input value={data.heroTag} onChange={e => setData({...data, heroTag: e.target.value})} className="peak-ui-input" />
                </div>
                <div>
                  <label className="peak-ui-label">Capa: Título</label>
                  <textarea value={data.heroTitle} onChange={e => setData({...data, heroTitle: e.target.value})} className="peak-ui-input h-20 resize-none" />
                </div>
                <div>
                  <label className="peak-ui-label">Capa: Fundo</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="w-full text-sm text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[var(--border)] file:text-white"
                    onChange={e => {
                      if (e.target.files?.[0]) setData({...data, heroPhoto: URL.createObjectURL(e.target.files[0])});
                    }}
                  />
                </div>
                
                <div className="border-t border-[var(--border)] pt-4 mt-4">
                  <label className="peak-ui-label">Slide 2: Tag</label>
                  <input value={data.slide2Tag} onChange={e => setData({...data, slide2Tag: e.target.value})} className="peak-ui-input mb-3" />
                  
                  <label className="peak-ui-label">Slide 2: Título</label>
                  <textarea value={data.slide2Title} onChange={e => setData({...data, slide2Title: e.target.value})} className="peak-ui-input h-20 resize-none" />
                </div>
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
              
              {/* SLIDE 1 (DARK) */}
              <div className="slide-wrapper relative w-[540px] h-[675px] shrink-0 overflow-hidden shadow-2xl rounded-sm">
                <div className="slide slide-dark slide-bottom" style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                  {data.heroPhoto && <div className="photo-mask" style={{ backgroundImage: `url(${data.heroPhoto})` }} />}
                  <div className="photo-overlay-dark" />
                  {data.logo && <div className="watermark" style={{ backgroundImage: `url(${data.logo})` }} />}
                  
                  <div className="slide-logo">
                    <div className="logo-circle" style={{ backgroundImage: data.logo ? `url(${data.logo})` : 'none' }} />
                    <div className="logo-text">{data.brandName}</div>
                  </div>
                  
                  <span className="slide-tag">{data.heroTag}</span>
                  <h2 className="slide-title whitespace-pre-wrap">{data.heroTitle}</h2>
                  <p className="slide-text max-w-[800px] leading-relaxed">{data.heroDesc}</p>
                </div>
              </div>

              {/* SLIDE 2 (DARK) */}
              <div className="slide-wrapper relative w-[540px] h-[675px] shrink-0 overflow-hidden shadow-2xl rounded-sm">
                <div className="slide slide-dark" style={{ transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                  {data.logo && <div className="watermark" style={{ backgroundImage: `url(${data.logo})` }} />}
                  <div className="slide-logo">
                    <div className="logo-circle" style={{ backgroundImage: data.logo ? `url(${data.logo})` : 'none' }} />
                    <div className="logo-text">1. O Início</div>
                  </div>
                  
                  <div className="mt-auto mb-10">
                    <span className="slide-tag">{data.slide2Tag}</span>
                    <h2 className="slide-title whitespace-pre-wrap text-[74px]">{data.slide2Title}</h2>
                    <p className="slide-text max-w-[800px] leading-relaxed">{data.slide2Desc}</p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
