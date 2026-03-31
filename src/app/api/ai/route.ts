import { NextResponse } from 'next/server';

const CAROUSEL_SYSTEM_PROMPT = `Você é um Especialista em Design de Carrosséis para Instagram. Sua única função é transformar textos brutos em uma estrutura JSON técnica para renderização.

### REGRAS CRÍTICAS:
1. DECISÃO DE DESIGN: Você decide a paleta de cores (HEX), fontes e layout. Não peça permissão, apenas execute.
2. LIMPEZA: Remova tags como "Capa:", "Slide:", "Descrição:". Entregue apenas o texto limpo dentro do JSON.
3. FORMATO: Responda APENAS com o JSON. Sem introduções, sem "Aqui está o seu JSON", sem blocos de código markdown.
4. VARIEDADE: Alterne layouts entre os slides (ex: texto à esquerda, texto centralizado, destaque) para manter o dinamismo.

### ESTRUTURA DO JSON:
{
  "config": { "theme": "string", "primaryColor": "HEX", "font": "string" },
  "slides": [
    {
      "id": number,
      "type": "cover|content|cta",
      "layout": "centered|split|full",
      "colors": { "bg": "HEX", "text": "HEX", "accent": "HEX" },
      "content": {
        "title": "string",
        "subtitle": "string",
        "body": "string",
        "tag": "string"
      },
      "visuals": { "icon": "string", "opacity": 0.5 }
    }
  ]
}

### REGRAS ADICIONAIS:
- Mínimo 5 slides, máximo 10 slides
- Primeiro slide SEMPRE do tipo "cover"
- Último slide SEMPRE do tipo "cta"
- Alternar layouts entre slides
- Cores harmoniosas e profissionais
- Textos curtos e impactantes`;

export async function POST(req: Request) {
  try {
    const { text, context } = await req.json();
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key não configurada' }, { status: 500 });
    }
    
    if (!text) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    const contextInfo = context ? `\n\nCONTEXTO ADICIONAL:\n${JSON.stringify(context)}` : '';

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://peak-saas.vercel.app',
          'X-Title': 'Peak Carousel Generator'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            {
              role: 'system',
              content: CAROUSEL_SYSTEM_PROMPT
            },
            {
              role: 'user', 
              content: `=== TEXTO BRUTO ===\n\n${text}${contextInfo}`
            }
          ],
          temperature: 0.8,
          max_tokens: 4000
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ error: data.error.message || 'Erro na API OpenRouter' }, { status: 500 });
    }

    const generatedText = data.choices?.[0]?.message?.content;
    
    if (!generatedText) {
      return NextResponse.json({ error: 'Nenhuma resposta gerada' }, { status: 500 });
    }

    // Try to extract JSON from response
    let jsonStr = generatedText;
    
    // Remove markdown code blocks if present
    const jsonMatch = generatedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    try {
      const carousel = JSON.parse(jsonStr);
      
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
