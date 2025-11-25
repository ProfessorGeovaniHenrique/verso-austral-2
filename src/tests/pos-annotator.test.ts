/**
 * 🧪 TESTES UNITÁRIOS - HYBRID POS ANNOTATOR LAYER 1
 * 
 * Valida o funcionamento da camada de gramática VA
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { annotateWithVAGrammar, calculateVAGrammarCoverage } from '@/services/hybridPOSAnnotator';

describe('Hybrid POS Annotator - Layer 1 (VA Grammar)', () => {
  describe('Verbos Irregulares', () => {
    it('deve anotar verbos irregulares corretamente', async () => {
      const texto = 'eu sou feliz e estava caminhando';
      const result = await annotateWithVAGrammar(texto);
      
      const sou = result.find(t => t.palavra === 'sou');
      const estava = result.find(t => t.palavra === 'estava');
      
      expect(sou).toBeDefined();
      expect(sou?.pos).toBe('VERB');
      expect(sou?.lema).toBe('ser');
      expect(sou?.source).toBe('va_grammar');
      expect(sou?.confidence).toBe(1.0);
      
      expect(estava).toBeDefined();
      expect(estava?.pos).toBe('VERB');
      expect(estava?.lema).toBe('estar');
      expect(estava?.source).toBe('va_grammar');
    });

    it('deve identificar verbos auxiliares', async () => {
      const texto = 'eu tenho estudado muito';
      const result = await annotateWithVAGrammar(texto);
      
      const tenho = result.find(t => t.palavra === 'tenho');
      expect(tenho?.posDetalhada).toBe('AUX');
    });

    it('deve anotar verbos gauchescos', async () => {
      const texto = 'o gaúcho campeia no campo e laça a tropa';
      const result = await annotateWithVAGrammar(texto);
      
      const campeia = result.find(t => t.palavra === 'campeia');
      const laca = result.find(t => t.palavra === 'laça');
      
      expect(campeia?.lema).toBe('campear');
      expect(laca?.lema).toBe('laçar');
    });
  });

  describe('Pronomes', () => {
    it('deve anotar pronomes pessoais', async () => {
      const texto = 'eu te amo e ela me vê';
      const result = await annotateWithVAGrammar(texto);
      
      const eu = result.find(t => t.palavra === 'eu');
      const te = result.find(t => t.palavra === 'te');
      const me = result.find(t => t.palavra === 'me');
      
      expect(eu?.pos).toBe('PRON');
      expect(te?.pos).toBe('PRON');
      expect(me?.pos).toBe('PRON');
    });

    it('deve anotar pronomes possessivos', async () => {
      const texto = 'meu cavalo e tua prenda';
      const result = await annotateWithVAGrammar(texto);
      
      const meu = result.find(t => t.palavra === 'meu');
      const tua = result.find(t => t.palavra === 'tua');
      
      expect(meu?.pos).toBe('PRON');
      expect(meu?.posDetalhada).toBe('PRON_POSS');
      expect(tua?.posDetalhada).toBe('PRON_POSS');
    });
  });

  describe('Determinantes (Artigos)', () => {
    it('deve anotar artigos definidos', async () => {
      const texto = 'o sol e a lua';
      const result = await annotateWithVAGrammar(texto);
      
      const o = result.find(t => t.palavra === 'o');
      const a = result.find(t => t.palavra === 'a');
      
      expect(o?.pos).toBe('DET');
      expect(o?.features.genero).toBe('Masc');
      expect(o?.features.numero).toBe('Sing');
      
      expect(a?.pos).toBe('DET');
      expect(a?.features.genero).toBe('Fem');
    });
  });

  describe('Preposições e Conjunções', () => {
    it('deve anotar preposições', async () => {
      const texto = 'de manhã na querência';
      const result = await annotateWithVAGrammar(texto);
      
      const de = result.find(t => t.palavra === 'de');
      const na = result.find(t => t.palavra === 'na');
      
      expect(de?.pos).toBe('ADP');
      expect(na?.pos).toBe('ADP');
    });

    it('deve anotar conjunções', async () => {
      const texto = 'e mas ou porque';
      const result = await annotateWithVAGrammar(texto);
      
      const e = result.find(t => t.palavra === 'e');
      const mas = result.find(t => t.palavra === 'mas');
      
      expect(e?.pos).toBe('CCONJ');
      expect(mas?.pos).toBe('CCONJ');
    });
  });

  describe('Advérbios', () => {
    it('deve anotar advérbios comuns', async () => {
      const texto = 'não vou hoje muito bem';
      const result = await annotateWithVAGrammar(texto);
      
      const nao = result.find(t => t.palavra === 'não');
      const hoje = result.find(t => t.palavra === 'hoje');
      const muito = result.find(t => t.palavra === 'muito');
      
      expect(nao?.pos).toBe('ADV');
      expect(hoje?.pos).toBe('ADV');
      expect(muito?.pos).toBe('ADV');
    });

    it('deve anotar advérbios terminados em -mente', async () => {
      const texto = 'caminhava lentamente';
      const result = await annotateWithVAGrammar(texto);
      
      const lentamente = result.find(t => t.palavra === 'lentamente');
      expect(lentamente?.pos).toBe('ADV');
      expect(lentamente?.lema).toBe('lento');
    });
  });

  describe('Heurísticas Morfológicas', () => {
    it('deve identificar substantivos femininos por sufixo', async () => {
      const texto = 'a tradição e a liberdade';
      const result = await annotateWithVAGrammar(texto);
      
      const tradicao = result.find(t => t.palavra === 'tradição');
      const liberdade = result.find(t => t.palavra === 'liberdade');
      
      expect(tradicao?.pos).toBe('NOUN');
      expect(tradicao?.features.genero).toBe('Fem');
      expect(liberdade?.pos).toBe('NOUN');
    });
  });

  describe('Palavras Desconhecidas', () => {
    it('deve marcar palavras desconhecidas com confiança 0', async () => {
      const texto = 'xyzabc palavrainventada';
      const result = await annotateWithVAGrammar(texto);
      
      const unknown1 = result.find(t => t.palavra === 'xyzabc');
      const unknown2 = result.find(t => t.palavra === 'palavrainventada');
      
      expect(unknown1?.pos).toBe('UNKNOWN');
      expect(unknown1?.confidence).toBe(0.0);
      expect(unknown2?.pos).toBe('UNKNOWN');
    });
  });

  describe('Cobertura e Estatísticas', () => {
    it('deve calcular cobertura corretamente', async () => {
      const texto = 'eu sou um gaúcho de tradição e campeiro no campo';
      const result = await annotateWithVAGrammar(texto);
      const stats = calculateVAGrammarCoverage(result);
      
      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.coveredByVA).toBeGreaterThan(0);
      expect(stats.coverageRate).toBeGreaterThan(50);
      expect(stats.sourceDistribution).toHaveProperty('va_grammar');
    });

    it('deve ter alta cobertura em texto gaúcho típico', async () => {
      const texto = `
        A calma do tarumã ganhou sombra mais copada
        Pela várzea espichada com o sol da tarde caindo
        Um pañuelo maragato se abriu no horizonte
      `;
      const result = await annotateWithVAGrammar(texto);
      const stats = calculateVAGrammarCoverage(result);
      
      // Espera-se >60% de cobertura com gramática VA em texto gaúcho
      expect(stats.coverageRate).toBeGreaterThan(60);
    });
  });

  describe('Cache de Anotações', () => {
    beforeEach(() => {
      // Cache é limpo automaticamente entre testes (memória)
    });

    it('deve cachear anotações corretamente', async () => {
      const texto1 = 'eu sou feliz';
      const texto2 = 'eu sou feliz'; // Mesmo texto
      
      const result1 = await annotateWithVAGrammar(texto1);
      const result2 = await annotateWithVAGrammar(texto2);
      
      // Segunda execução deve usar cache
      const sou2 = result2.find(t => t.palavra === 'sou');
      expect(sou2?.source).toBe('cache');
    });
  });

  describe('MWEs Gaúchas', () => {
    it('deve detectar MWEs como token único', async () => {
      const texto = 'tomei mate amargo no galpão';
      const result = await annotateWithVAGrammar(texto);
      
      // "mate amargo" deve ser tokenizado como MWE única
      const mateAmargo = result.find(t => t.palavra === 'mate amargo');
      expect(mateAmargo).toBeDefined();
    });

    it('deve anotar MWEs de cavalos', async () => {
      const texto = 'um cavalo gateado e um cavalo tordilho';
      const result = await annotateWithVAGrammar(texto);
      
      const gateado = result.find(t => t.palavra.includes('gateado'));
      const tordilho = result.find(t => t.palavra.includes('tordilho'));
      
      expect(gateado).toBeDefined();
      expect(tordilho).toBeDefined();
    });
  });
});
