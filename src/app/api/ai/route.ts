import { NextResponse } from 'next/server';

const CAROUSEL_SYSTEM_PROMPT = `Você é um Engenheiro de Design System especializado em automação de conteúdo para Instagram. Sua função é receber textos brutos e transformá-los em uma estrutura de dados JSON rigorosa para renderização de carrosséis profissionais.

### REGRAS DE OURO:
1. PARSE INTELIGENTE: Identifique e extraia o conteúdo real, ignorando marcações como "Capa:", "Slide X:", "Título:".
2. DESIGN DECISION: Você detém o controle criativo. Defina paletas de cores (HEX), fontes (Google Fonts), espaçamentos e variantes de layout.
3. FORMATO ÚNICO: Responda EXCLUSIVAMENTE com o objeto JSON. Não inclua blocos de código (\`\`\`json), comentários ou introduções.
4. COERÊNCIA: O tema (cores e fontes) deve ser consistente em todos os slides, mas o layout interno deve variar para evitar monotonia.

### SCHEMA JSON OBRIGATÓRIO:
{
  "metadata": {
    "themeName": "string",
    "mainFont": "string",
    "secondaryFont": "string",
    "totalSlides": "number"
  },
  "slides": [
    {
      "index": "number",
      "type": "cover" | "content" | "highlight" | "cta",
      "layout": "centered" | "split_left" | "split_right" | "grid",
      "style": {
        "backgroundColor": "HEX",
        "textColor": "HEX",
        "accentColor": "HEX",
        "gradient": "string (CSS linear-gradient ou null)"
      },
      "content": {
        "tagline": "string",
        "title": "string",
        "description": "string",
        "footer": "string"
      },
      "visuals": {
        "icon": "string (nome de ícone Lucide)",
        "shape": "circle" | "square" | "blob",
        "opacity": "number (0-1)"
      }
    }
  ]
}

### REGRAS DE LAYOUT:
- cover: slide inicial com título impactante, layout centered
- content: slides de conteúdo com layout split_left ou split_right
- highlight: slides de destaque com layout grid para listas
- cta: slide final com chamada para ação, layout centered

### REGRAS DE CORES:
- Use cores harmoniosas (complementares ou análogas)
- Varie os backgrounds entre slides (dark/light/accent)
- Accent color deve ser consistente em todos os slides

### MÍNIMO: 5 slides | MÁXIMO: 10 slides`;

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
                { text: `=== TEXTO BRUTO ===\n\n${text}${contextInfo}` }
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
      return NextResponse.json({ error: 'Nenhuma resposta gerada' }, { status: 500 });
    }

    try {
      const carousel = JSON.parse(generatedText);
      
      if (!carousel.slides || !Array.isArray(carousel.slides) || carousel.slides.length < 5) {
        return NextResponse.json({ error: 'Estrutura de slides inválida', raw: generatedText }, { status: 500 });
      }
      
      return NextResponse.json(carousel);
    } catch (parseError) {
      return NextResponse.json({ error: 'Erro ao processar resposta da IA', raw: generatedText }, { status: 500 });
    }
    
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
