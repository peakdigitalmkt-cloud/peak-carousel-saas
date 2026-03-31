import { NextResponse } from 'next/server';

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

interface CarouselOutput {
  brandName: string;
  slides: Slide[];
}

const CAROUSEL_SYSTEM_PROMPT = `Você é um especialista em marketing digital e design de carrosséis para Instagram. Sua função é receber texto bruto de uma tarefa do Asana e transformar em um carrossel profissional completo, seguindo rigorosamente o padrão abaixo.

=== PADRÃO DO CARROSSEL (referência: Dr Roberto) ===

ESTRUTURA: 7 slides sempre, nesta ordem fixa:
1. HERO/GANCHO (slide-gradient)
2. PROBLEMA (slide-dark)
3. SOLUÇÃO (slide-gradient)  
4. RECURSOS/EXAMES (slide-light)
5. DETALHES/PERSONALIZAÇÃO (slide-dark)
6. COMO FUNCIONA/PROCEDIMENTO (slide-light)
7. CTA (slide-gradient)

TIPOGRAFIA:
- tag: uppercase, letter-spacing 6px, 24px font
- title: Playfair Display, 84px, negrito, line-height 1.1
- desc: DM Sans, 38px, regular

COMPONENTES DISPONÍVEIS (use obrigatoriamente):
- quote-box: caixa de citação com blur (usar no slide 2)
- feature-list: lista com 3 itens numerados ou com emojis (usar nos slides 4 e 6)
- glass-card com pills: tags/opções dentro de card com efeito vidro (usar no slide 5)
- cta: botão de ação (usar no slide 7)

=== SUAS RESPONSABILIDADES ===

1. Ler o texto bruto do Asana
2. Extrair o nome da marca/profissional
3. Identificar: problema, solução, benefícios, diferenciais
4. Organizar em 7 slides seguindo a estrutura
5. Escolher componentes apropriados para cada slide
6. Gerar textos persuasivos, curtos e impactantes
7. REMOVER qualquer prefixo como "Slide", "Título:", "Descrição:", etc.
8. Gerar citações convincentes para o quote-box
9. Criar feature lists com 3 itens relevantes
10. Extrair/opinar pills/tags para o glass-card

=== FORMATO DE SAÍDA ===

RESPONDA APENAS COM JSON VÁLIDO (sem markdown, sem explicações):

{
  "brandName": "Nome da Marca Extraído",
  "slides": [
    {
      "tag": "GANCHO",
      "title": "Título Impactante em 2-3 linhas",
      "desc": "Subtítulo de apoio curto e direto"
    },
    {
      "tag": "O PROBLEMA",
      "title": "Título do Problema",
      "desc": "Explicação da dor/necessidade",
      "component": "quote-box",
      "quoteTag": "Sinais de alerta",
      "quote": "Citação realista do paciente/cliente"
    },
    {
      "tag": "A SOLUÇÃO",
      "title": "Título da Solução",
      "desc": "Como resolve o problema"
    },
    {
      "tag": "RECURSOS",
      "title": "Título dos Recursos",
      "desc": "Introdução aos recursos",
      "component": "feature-list",
      "features": [
        {"title": "Primeiro Recurso", "desc": "Descrição detalhada"},
        {"title": "Segundo Recurso", "desc": "Descrição detalhada"},
        {"title": "Terceiro Recurso", "desc": "Descrição detalhada"}
      ]
    },
    {
      "tag": "PERSONALIZAÇÃO",
      "title": "Título dos Detalhes",
      "desc": "Explicação da personalização",
      "component": "glass-card",
      "pills": ["Opção 1", "Opção 2", "Opção 3"]
    },
    {
      "tag": "COMO FUNCIONA",
      "title": "Título do Processo",
      "desc": "Breve explicação",
      "component": "feature-list",
      "features": [
        {"title": "👁️ Primeiro Passo", "desc": "Descrição"},
        {"title": "⏱️ Segundo Passo", "desc": "Descrição"},
        {"title": "🏠 Terceiro Passo", "desc": "Descrição"}
      ]
    },
    {
      "tag": "AGENDE SUA AVALIAÇÃO",
      "title": "Chamada Final Impactante",
      "desc": "Subtítulo motivacional",
      "component": "cta"
    }
  ]
}

=== REGRAS ===
- SEMPRE 7 slides
- Textos CURTOS e DIRETOS (título máximo 60 caracteres, desc máximo 200)
- Use tom profissional mas acessível
- Crie citações convincentes para o quote-box
- Feature titles devem ser concisos
- Pills/tags devem ser 3 palavras curtas`;

export async function POST(req: Request) {
  try {
    const { text, context } = await req.json();
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key não configurada no servidor' }, { status: 500 });
    }
    
    if (!text) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    const contextInfo = context ? `\n\nCONTEXTO ADICIONAL:\n${JSON.stringify(context)}` : '';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: CAROUSEL_SYSTEM_PROMPT },
                { text: `=== TEXTO BRUTO DO ASANA ===\n\n${text}${contextInfo}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            topP: 0.9,
            topK: 40,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'Erro na API Gemini' }, { status: 500 });
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      return NextResponse.json({ error: 'Nenhuma resposta gerada' }, { status:500 });
    }

    // Parse JSON response
    try {
      const carousel = JSON.parse(generatedText);
      
      // Validar estrutura
      if (!carousel.slides || !Array.isArray(carousel.slides) || carousel.slides.length < 5) {
        return NextResponse.json({ error: 'Estrutura de slides inválida', raw: generatedText }, { status: 500 });
      }
      
      // Garantir que temos 7 slides
      while (carousel.slides.length < 7) {
        const idx = carousel.slides.length;
        if (idx === 6) {
          carousel.slides.push({
            tag: 'AGENDE SUA AVALIAÇÃO',
            title: 'Transforme seus resultados',
            desc: 'Comece agora mesmo.',
            component: 'cta'
          });
        }
      }
      
      return NextResponse.json(carousel);
    } catch (parseError) {
      return NextResponse.json({ error: 'Erro ao processar resposta da IA', raw: generatedText }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
