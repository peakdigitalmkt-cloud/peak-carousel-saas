import { NextResponse } from 'next/server';

interface Slide {
  tag: string;
  title: string;
  desc: string;
  component?: 'quote-box' | 'feature-list' | 'glass-card' | 'pills' | 'cta';
  features?: { title: string; desc: string }[];
  pills?: string[];
  quote?: string;
  quoteTag?: string;
}

const SLIDE_PROMPT = `Você é um especialista em marketing e design de carrosséis para Instagram.

Receba o texto bruto de uma descrição do Asana e organize em slides para um carrossel profissional.

REGRAS OBRIGATÓRIAS:
1. SEMPRE crie entre 5 e 7 slides
2. O PRIMEIRO slide é SEMPRE "GANCHO" com título impactante
3. O ÚLTIMO slide é SEMPRE "CTA" com chamada para ação
4. REMOVA completamente prefixos como "Slide", "Título", "Subtítulo", "Descrição", etc.
5. Extraia apenas o CONTEÚDO PURO

PADRÃO DOS SLIDES (nesta ordem):
1. GANCHO → título forte + subtítulo curto
2. PROBLEMA → título + descrição + opcional: quote-box com citação
3. SOLUÇÃO → título + descrição
4. RECURSOS → título + feature-list (3 itens com título+descrição cada)
5. DETALHES → título + glass-card com pills (tags/etiquetas)
6. COMO FUNCIONA → título + feature-list com emojis (3 itens)
7. CTA → título + chamada para ação

RESPONDA APENAS COM JSON VÁLIDO no formato:
{
  "slides": [
    {
      "tag": "GANCHO",
      "title": "Título Impactante",
      "desc": "Subtítulo de apoio"
    },
    {
      "tag": "PROBLEMA", 
      "title": "Título do Problema",
      "desc": "Descrição",
      "component": "quote-box",
      "quoteTag": "Sinais de alerta",
      "quote": "Citação aqui"
    },
    {
      "tag": "SOLUÇÃO",
      "title": "Título",
      "desc": "Descrição"
    },
    {
      "tag": "RECURSOS",
      "title": "Título",
      "desc": "Descrição",
      "component": "feature-list",
      "features": [
        {"title": "Item 1", "desc": "Descrição"},
        {"title": "Item 2", "desc": "Descrição"},
        {"title": "Item 3", "desc": "Descrição"}
      ]
    },
    {
      "tag": "DETALHES",
      "title": "Título",
      "desc": "Descrição",
      "component": "glass-card",
      "pills": ["Tag 1", "Tag 2", "Tag 3"]
    },
    {
      "tag": "COMO FUNCIONA",
      "title": "Título",
      "desc": "Descrição",
      "component": "feature-list",
      "features": [
        {"title": "👁️ Primeiro", "desc": "Descrição"},
        {"title": "⏱️ Segundo", "desc": "Descrição"},
        {"title": "🏠 Terceiro", "desc": "Descrição"}
      ]
    },
    {
      "tag": "CTA",
      "title": "Chamada para Ação",
      "desc": "Subtítulo final",
      "component": "cta"
    }
  ]
}

SE o conteúdo não tiver itens suficientes para feature-list ou pills, use placeholders criativos.`;

export async function POST(req: Request) {
  try {
    const { text, token } = await req.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Gemini API key não configurada' }, { status: 400 });
    }
    
    if (!text) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SLIDE_PROMPT },
                { text: `Aqui está o texto para organizar:\n\n${text}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
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
      return NextResponse.json({ error: 'Nenhuma resposta gerada' }, { status: 500 });
    }

    // Parse JSON response
    try {
      const slides = JSON.parse(generatedText);
      return NextResponse.json(slides);
    } catch (parseError) {
      return NextResponse.json({ error: 'Erro ao processar resposta da IA', raw: generatedText }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
