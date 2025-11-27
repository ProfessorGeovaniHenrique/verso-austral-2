/**
 * Batch classification with Gemini Flash for semantic domains
 */

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GEMINI_MODEL = 'google/gemini-2.5-flash';

interface WordToClassify {
  palavra: string;
  lema?: string;
  pos?: string;
}

interface ClassificationResult {
  palavra: string;
  lema?: string;
  pos?: string;
  tagset_codigo: string;
  confianca: number;
}

export async function classifyBatchWithGemini(
  words: WordToClassify[],
  logger: any
): Promise<ClassificationResult[]> {
  
  const prompt = buildBatchPrompt(words);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2, // Baixa para consistência
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[gemini-batch] API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[gemini-batch] Raw response:', JSON.stringify(data).substring(0, 500));
    
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error('[gemini-batch] Empty content in response:', data);
      throw new Error('Empty response from Gemini');
    }

    // Parse JSON response
    console.log('[gemini-batch] Parsing content:', content.substring(0, 300));
    const parsed = JSON.parse(content);
    
    console.log('[gemini-batch] Successfully classified', parsed.classifications?.length || 0, 'words');
    return parsed.classifications || [];

  } catch (error) {
    console.error('[gemini-batch] Classification error:', error);
    logger.error('Batch classification error', error as Error);
    
    // Fallback: retornar NC para todas
    return words.map(w => ({
      palavra: w.palavra,
      lema: w.lema,
      pos: w.pos,
      tagset_codigo: 'NC',
      confianca: 0.50
    }));
  }
}

function getSystemPrompt(): string {
  return `Você é um especialista em classificação semântica para o projeto Verso Austral.
Classifique cada palavra no domínio semântico mais apropriado usando os códigos fornecidos.
Retorne APENAS um JSON válido no formato:
{
  "classifications": [
    {"palavra": "...", "tagset_codigo": "...", "confianca": 0.85}
  ]
}`;
}

function buildBatchPrompt(words: WordToClassify[]): string {
  const wordsList = words.map((w, i) => 
    `${i + 1}. ${w.palavra}${w.lema ? ` (lema: ${w.lema})` : ''}${w.pos ? ` [${w.pos}]` : ''}`
  ).join('\n');

  return `Classifique as seguintes palavras nos domínios semânticos:

DOMÍNIOS DISPONÍVEIS:
- SH (Ser Humano): corpo, pessoa, características humanas
- NA (Natureza): animais, plantas, paisagem, clima
- AP (Atividades): trabalho, alimentação, transporte, lazer
- OA (Objetos e Artefatos): ferramentas, equipamentos, construções
- AB (Abstrações): conceitos filosóficos, valores, ideias
- SA (Sentimentos): emoções, estados mentais
- TM (Tempo): cronologia, períodos, momentos
- ES (Espaço): lugares, direções, distâncias
- MG (Medidas e Grandezas): quantidades, dimensões
- MV (Movimento): ações, deslocamentos
- RE (Relações): vínculos sociais, familiares
- CM (Comunicação): linguagem, mídia, informação
- CC (Cultura): arte, educação, ciência, religião
- SP (Sociedade): política, governo, lei
- SB (Saúde): doenças, tratamentos, bem-estar
- NC (Não Classificado): use apenas se nenhum domínio se aplica

PALAVRAS:
${wordsList}

Retorne JSON válido com a classificação de cada palavra.`;
}
