import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { corpusType, projectBaseUrl } = await req.json();
    
    if (!corpusType || !projectBaseUrl) {
      throw new Error('corpusType e projectBaseUrl são obrigatórios');
    }

    console.log(`PROGRESS:0:Iniciando divisão do corpus ${corpusType}...`);
    console.log(`📂 Processando corpus ${corpusType} do ${projectBaseUrl}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (corpusType !== 'gaucho') {
      throw new Error('Atualmente apenas corpus "gaucho" é suportado');
    }

    // Fetch do arquivo completo via streaming
    console.log(`PROGRESS:5:Carregando corpus completo...`);
    const sourceUrl = `${projectBaseUrl}/corpus/full-text/gaucho-completo.txt`;
    console.log(`🌐 Buscando arquivo: ${sourceUrl}`);
    
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Falha ao carregar corpus: HTTP ${response.status}`);
    }

    console.log(`PROGRESS:10:Dividindo corpus linha por linha...`);
    
    // Processar stream linha por linha
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let lineCount = 0;
    const part1Lines: string[] = [];
    const part2Lines: string[] = [];
    const part3Lines: string[] = [];
    
    // Pontos de divisão conforme documentado
    const PART1_END = 298001;
    const PART2_END = 596048;
    // PART3 vai até o final (linha 894135)
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Última linha pode estar incompleta
      
      for (const line of lines) {
        lineCount++;
        
        // Log de progresso a cada 10000 linhas
        if (lineCount % 10000 === 0) {
          const progress = 10 + Math.floor((lineCount / 894135) * 40); // 10% a 50%
          console.log(`PROGRESS:${progress}:Processando linha ${lineCount}/894135...`);
        }
        
        if (lineCount <= PART1_END) {
          part1Lines.push(line);
        } else if (lineCount <= PART2_END) {
          part2Lines.push(line);
        } else {
          part3Lines.push(line);
        }
      }
    }
    
    // Processar última linha se houver
    if (buffer) {
      lineCount++;
      if (lineCount <= PART1_END) {
        part1Lines.push(buffer);
      } else if (lineCount <= PART2_END) {
        part2Lines.push(buffer);
      } else {
        part3Lines.push(buffer);
      }
    }
    
    console.log(`✅ Corpus dividido: ${lineCount} linhas totais`);
    console.log(`   Parte 1: ${part1Lines.length} linhas`);
    console.log(`   Parte 2: ${part2Lines.length} linhas`);
    console.log(`   Parte 3: ${part3Lines.length} linhas`);
    
    // Upload das 3 partes com retry logic
    const parts = [
      { name: 'gaucho-parte-01.txt', content: part1Lines.join('\n'), lines: part1Lines.length },
      { name: 'gaucho-parte-02.txt', content: part2Lines.join('\n'), lines: part2Lines.length },
      { name: 'gaucho-parte-03.txt', content: part3Lines.join('\n'), lines: part3Lines.length }
    ];
    
    const uploads = [];
    let totalSize = 0;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const progressBase = 50 + (i * 16); // 50%, 66%, 82%
      
      console.log(`PROGRESS:${progressBase}:Fazendo upload ${part.name}...`);
      console.log(`📤 [${i + 1}/3] Upload de ${part.name} (${part.lines} linhas)...`);
      
      const blob = new Blob([part.content], { type: 'text/plain; charset=utf-8' });
      const fileSize = blob.size;
      totalSize += fileSize;
      
      // Retry logic: 3 tentativas com delay exponencial
      let uploaded = false;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 3 && !uploaded; attempt++) {
        try {
          const { data, error } = await supabase.storage
            .from('corpus')
            .upload(`full-text/${part.name}`, blob, { 
              contentType: 'text/plain; charset=utf-8',
              upsert: true 
            });
          
          if (error) {
            throw error;
          }
          
          uploaded = true;
          console.log(`✅ ${part.name} enviado com sucesso na tentativa ${attempt}`);
          
          // Verificar upload
          const { data: downloadData, error: downloadError } = await supabase.storage
            .from('corpus')
            .download(`full-text/${part.name}`);
          
          if (downloadError) {
            console.warn(`⚠️ Erro ao verificar ${part.name}: ${downloadError.message}`);
          } else {
            const verifySize = downloadData.size;
            console.log(`🔍 Verificação: ${part.name} tem ${verifySize} bytes (esperado: ${fileSize})`);
          }
          
          uploads.push({
            file: part.name,
            lines: part.lines,
            size: fileSize,
            sizeMB: (fileSize / 1024 / 1024).toFixed(2),
            path: data?.path || `full-text/${part.name}`,
            verified: true
          });
          
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Tentativa ${attempt} falhou para ${part.name}: ${error.message}`);
          
          if (attempt < 3) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
            console.log(`⏳ Aguardando ${delay}ms antes de retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (!uploaded) {
        throw new Error(`Upload de ${part.name} falhou após 3 tentativas: ${lastError?.message || 'Erro desconhecido'}`);
      }
    }
    
    console.log(`PROGRESS:100:Concluído! 3 partes enviadas com sucesso.`);
    console.log(`\n✨ Upload completo!`);
    console.log(`   Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Linhas: ${lineCount}`);
    console.log(`   Arquivos: ${uploads.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Corpus dividido e enviado com sucesso',
        totalLines: lineCount,
        totalSize: totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        uploads: uploads
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('❌ Erro fatal:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido',
        stack: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
