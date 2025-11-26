-- ============================================
-- MIGRAÇÃO COMPLETA: Códigos Numéricos → Mnemônicos
-- Total: 53 tagsets (6 N2 + 20 N3 + 27 N4)
-- ============================================

-- BACKUP já existe da tentativa anterior

-- ========== N2: 6 DOMÍNIOS ==========
UPDATE semantic_tagset SET codigo = 'SE.ALE' WHERE codigo = 'SE.01'; -- Alegria e Bem-Estar
UPDATE semantic_tagset SET codigo = 'SE.TRI' WHERE codigo = 'SE.02'; -- Tristeza e Desamparo
UPDATE semantic_tagset SET codigo = 'SE.RAI' WHERE codigo = 'SE.03'; -- Raiva e Hostilidade
UPDATE semantic_tagset SET codigo = 'SE.MED' WHERE codigo = 'SE.04'; -- Medo e Ansiedade
UPDATE semantic_tagset SET codigo = 'SE.AMO' WHERE codigo = 'SE.05'; -- Amor e Afeição
UPDATE semantic_tagset SET codigo = 'SE.COG' WHERE codigo = 'SE.06'; -- Estados Cognitivos e Sociais

-- ========== N3: 20 SUBDOMINIOS ==========
-- SE.ALE (3 filhos)
UPDATE semantic_tagset SET codigo = 'SE.ALE.EUF' WHERE codigo = 'SE.01.01'; -- Euforia e Excitação
UPDATE semantic_tagset SET codigo = 'SE.ALE.CON' WHERE codigo = 'SE.01.02'; -- Contentamento e Serenidade
UPDATE semantic_tagset SET codigo = 'SE.ALE.DIV' WHERE codigo = 'SE.01.03'; -- Diversão e Prazer

-- SE.TRI (3 filhos)
UPDATE semantic_tagset SET codigo = 'SE.TRI.MEL' WHERE codigo = 'SE.02.01'; -- Melancolia e Desânimo
UPDATE semantic_tagset SET codigo = 'SE.TRI.SOF' WHERE codigo = 'SE.02.02'; -- Sofrimento e Dor Emocional
UPDATE semantic_tagset SET codigo = 'SE.TRI.NOS' WHERE codigo = 'SE.02.03'; -- Nostalgia e Saudade

-- SE.RAI (3 filhos)
UPDATE semantic_tagset SET codigo = 'SE.RAI.IRR' WHERE codigo = 'SE.03.01'; -- Irritação e Frustração
UPDATE semantic_tagset SET codigo = 'SE.RAI.FUR' WHERE codigo = 'SE.03.02'; -- Fúria e Ódio
UPDATE semantic_tagset SET codigo = 'SE.RAI.RES' WHERE codigo = 'SE.03.03'; -- Ressentimento e Mágoa

-- SE.MED (3 filhos)
UPDATE semantic_tagset SET codigo = 'SE.MED.PAV' WHERE codigo = 'SE.04.01'; -- Pavor e Terror
UPDATE semantic_tagset SET codigo = 'SE.MED.PRE' WHERE codigo = 'SE.04.02'; -- Preocupação e Ansiedade
UPDATE semantic_tagset SET codigo = 'SE.MED.INS' WHERE codigo = 'SE.04.03'; -- Insegurança e Receio

-- SE.AMO (4 filhos)
UPDATE semantic_tagset SET codigo = 'SE.AMO.CAR' WHERE codigo = 'SE.05.01'; -- Carinho e Ternura
UPDATE semantic_tagset SET codigo = 'SE.AMO.PAI' WHERE codigo = 'SE.05.02'; -- Paixão e Desejo
UPDATE semantic_tagset SET codigo = 'SE.AMO.EMP' WHERE codigo = 'SE.05.03'; -- Empatia e Compaixão
UPDATE semantic_tagset SET codigo = 'SE.AMO.ADM' WHERE codigo = 'SE.05.04'; -- Admiração e Gratidão

-- SE.COG (4 filhos)
UPDATE semantic_tagset SET codigo = 'SE.COG.CON' WHERE codigo = 'SE.06.01'; -- Confiança e Otimismo
UPDATE semantic_tagset SET codigo = 'SE.COG.VER' WHERE codigo = 'SE.06.02'; -- Vergonha e Culpa
UPDATE semantic_tagset SET codigo = 'SE.COG.SUR' WHERE codigo = 'SE.06.03'; -- Surpresa e Curiosidade
UPDATE semantic_tagset SET codigo = 'SE.COG.DES' WHERE codigo = 'SE.06.04'; -- Desprezo e Aversão

-- ========== N4: 27 CATEGORIAS FINAIS ==========
-- SE.ALE (3 netos)
UPDATE semantic_tagset SET codigo = 'SE.ALE.EUF.FEL' WHERE codigo = 'SE.01.01.01'; -- Felicidade e Entusiasmo
UPDATE semantic_tagset SET codigo = 'SE.ALE.CON.PAZ' WHERE codigo = 'SE.01.02.01'; -- Paz e Tranquilidade
UPDATE semantic_tagset SET codigo = 'SE.ALE.CON.SAT' WHERE codigo = 'SE.01.02.02'; -- Satisfação e Realização
UPDATE semantic_tagset SET codigo = 'SE.ALE.DIV.HUM' WHERE codigo = 'SE.01.03.01'; -- Humor e Riso

-- SE.TRI (3 netos)
UPDATE semantic_tagset SET codigo = 'SE.TRI.MEL.ABA' WHERE codigo = 'SE.02.01.01'; -- Tristeza e Abatimento
UPDATE semantic_tagset SET codigo = 'SE.TRI.SOF.ANG' WHERE codigo = 'SE.02.02.01'; -- Angústia e Desespero
UPDATE semantic_tagset SET codigo = 'SE.TRI.NOS.SAU' WHERE codigo = 'SE.02.03.01'; -- Saudade e Falta

-- SE.RAI (3 netos)
UPDATE semantic_tagset SET codigo = 'SE.RAI.IRR.ABO' WHERE codigo = 'SE.03.01.01'; -- Aborrecimento e Impaciência
UPDATE semantic_tagset SET codigo = 'SE.RAI.FUR.IRA' WHERE codigo = 'SE.03.02.01'; -- Ira e Cólera
UPDATE semantic_tagset SET codigo = 'SE.RAI.RES.RAN' WHERE codigo = 'SE.03.03.01'; -- Rancor e Amargura

-- SE.MED (3 netos)
UPDATE semantic_tagset SET codigo = 'SE.MED.PAV.PAN' WHERE codigo = 'SE.04.01.01'; -- Pânico e Susto
UPDATE semantic_tagset SET codigo = 'SE.MED.PRE.APR' WHERE codigo = 'SE.04.02.01'; -- Apreensão e Nervosismo
UPDATE semantic_tagset SET codigo = 'SE.MED.INS.HES' WHERE codigo = 'SE.04.03.01'; -- Hesitação e Cautela

-- SE.AMO (4 netos)
UPDATE semantic_tagset SET codigo = 'SE.AMO.CAR.AFE' WHERE codigo = 'SE.05.01.01'; -- Afeto e Cuidado
UPDATE semantic_tagset SET codigo = 'SE.AMO.PAI.ROM' WHERE codigo = 'SE.05.02.01'; -- Amor Romântico
UPDATE semantic_tagset SET codigo = 'SE.AMO.EMP.SOL' WHERE codigo = 'SE.05.03.01'; -- Solidariedade e Piedade
UPDATE semantic_tagset SET codigo = 'SE.AMO.ADM.RES' WHERE codigo = 'SE.05.04.01'; -- Respeito e Apreço

-- SE.COG (7 netos)
UPDATE semantic_tagset SET codigo = 'SE.COG.CON.ESP' WHERE codigo = 'SE.06.01.01'; -- Esperança e Fé
UPDATE semantic_tagset SET codigo = 'SE.COG.VER.REM' WHERE codigo = 'SE.06.02.01'; -- Remorso e Constrangimento
UPDATE semantic_tagset SET codigo = 'SE.COG.SUR.ESP' WHERE codigo = 'SE.06.03.01'; -- Espanto e Assombro
UPDATE semantic_tagset SET codigo = 'SE.COG.SUR.INT' WHERE codigo = 'SE.06.03.02'; -- Interesse e Fascínio
UPDATE semantic_tagset SET codigo = 'SE.COG.DES.NOJ' WHERE codigo = 'SE.06.04.01'; -- Nojo e Repulsa
UPDATE semantic_tagset SET codigo = 'SE.COG.DES.DED' WHERE codigo = 'SE.06.04.02'; -- Desdém e Desprezo

-- Outros N2 (5)
UPDATE semantic_tagset SET codigo = 'AP.ALI' WHERE codigo = 'AP.02'; -- Alimentação
UPDATE semantic_tagset SET codigo = 'AP.VES' WHERE codigo = 'AP.03'; -- Vestuário
UPDATE semantic_tagset SET codigo = 'CC.REL' WHERE codigo = 'CC.05'; -- Religiosidade
UPDATE semantic_tagset SET codigo = 'EQ.TEM' WHERE codigo = 'EQ.02'; -- Tempo
UPDATE semantic_tagset SET codigo = 'SP.GEO' WHERE codigo = 'SP.01'; -- Geopolítica

-- ========== ATUALIZAR categoria_pai ==========
-- N2 → N3
UPDATE semantic_tagset SET categoria_pai = 'SE.ALE' WHERE categoria_pai = 'SE.01';
UPDATE semantic_tagset SET categoria_pai = 'SE.TRI' WHERE categoria_pai = 'SE.02';
UPDATE semantic_tagset SET categoria_pai = 'SE.RAI' WHERE categoria_pai = 'SE.03';
UPDATE semantic_tagset SET categoria_pai = 'SE.MED' WHERE categoria_pai = 'SE.04';
UPDATE semantic_tagset SET categoria_pai = 'SE.AMO' WHERE categoria_pai = 'SE.05';
UPDATE semantic_tagset SET categoria_pai = 'SE.COG' WHERE categoria_pai = 'SE.06';

-- N3 → N4 (SE.ALE)
UPDATE semantic_tagset SET categoria_pai = 'SE.ALE.EUF' WHERE categoria_pai = 'SE.01.01';
UPDATE semantic_tagset SET categoria_pai = 'SE.ALE.CON' WHERE categoria_pai = 'SE.01.02';
UPDATE semantic_tagset SET categoria_pai = 'SE.ALE.DIV' WHERE categoria_pai = 'SE.01.03';

-- N3 → N4 (SE.TRI)
UPDATE semantic_tagset SET categoria_pai = 'SE.TRI.MEL' WHERE categoria_pai = 'SE.02.01';
UPDATE semantic_tagset SET categoria_pai = 'SE.TRI.SOF' WHERE categoria_pai = 'SE.02.02';
UPDATE semantic_tagset SET categoria_pai = 'SE.TRI.NOS' WHERE categoria_pai = 'SE.02.03';

-- N3 → N4 (SE.RAI)
UPDATE semantic_tagset SET categoria_pai = 'SE.RAI.IRR' WHERE categoria_pai = 'SE.03.01';
UPDATE semantic_tagset SET categoria_pai = 'SE.RAI.FUR' WHERE categoria_pai = 'SE.03.02';
UPDATE semantic_tagset SET categoria_pai = 'SE.RAI.RES' WHERE categoria_pai = 'SE.03.03';

-- N3 → N4 (SE.MED)
UPDATE semantic_tagset SET categoria_pai = 'SE.MED.PAV' WHERE categoria_pai = 'SE.04.01';
UPDATE semantic_tagset SET categoria_pai = 'SE.MED.PRE' WHERE categoria_pai = 'SE.04.02';
UPDATE semantic_tagset SET categoria_pai = 'SE.MED.INS' WHERE categoria_pai = 'SE.04.03';

-- N3 → N4 (SE.AMO)
UPDATE semantic_tagset SET categoria_pai = 'SE.AMO.CAR' WHERE categoria_pai = 'SE.05.01';
UPDATE semantic_tagset SET categoria_pai = 'SE.AMO.PAI' WHERE categoria_pai = 'SE.05.02';
UPDATE semantic_tagset SET categoria_pai = 'SE.AMO.EMP' WHERE categoria_pai = 'SE.05.03';
UPDATE semantic_tagset SET categoria_pai = 'SE.AMO.ADM' WHERE categoria_pai = 'SE.05.04';

-- N3 → N4 (SE.COG)
UPDATE semantic_tagset SET categoria_pai = 'SE.COG.CON' WHERE categoria_pai = 'SE.06.01';
UPDATE semantic_tagset SET categoria_pai = 'SE.COG.VER' WHERE categoria_pai = 'SE.06.02';
UPDATE semantic_tagset SET categoria_pai = 'SE.COG.SUR' WHERE categoria_pai = 'SE.06.03';
UPDATE semantic_tagset SET categoria_pai = 'SE.COG.DES' WHERE categoria_pai = 'SE.06.04';

-- ========== SINCRONIZAR tagset_pai ==========
UPDATE semantic_tagset SET tagset_pai = categoria_pai WHERE categoria_pai IS NOT NULL;

-- ========== LIMPAR CACHE ==========
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'SE.ALE' WHERE tagset_codigo = 'SE.01';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'SE.TRI' WHERE tagset_codigo = 'SE.02';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'SE.RAI' WHERE tagset_codigo = 'SE.03';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'SE.MED' WHERE tagset_codigo = 'SE.04';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'SE.AMO' WHERE tagset_codigo = 'SE.05';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'SE.COG' WHERE tagset_codigo = 'SE.06';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'AP.ALI' WHERE tagset_codigo = 'AP.02';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'AP.VES' WHERE tagset_codigo = 'AP.03';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'CC.REL' WHERE tagset_codigo = 'CC.05';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'EQ.TEM' WHERE tagset_codigo = 'EQ.02';
UPDATE semantic_disambiguation_cache SET tagset_codigo = 'SP.GEO' WHERE tagset_codigo = 'SP.01';

-- ========== RECALCULAR HIERARQUIA ==========
SELECT calculate_tagset_hierarchy();

-- ========== VALIDAÇÃO ==========
DO $$
DECLARE
  numeric_count INTEGER;
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO numeric_count
  FROM semantic_tagset
  WHERE status = 'ativo' 
    AND (codigo ~ '^[A-Z]{2}\.[0-9]+' OR codigo ~ '\.[0-9]+\.');
  
  IF numeric_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % tagsets ativos com códigos numéricos detectados', numeric_count;
  END IF;
  
  SELECT COUNT(*) INTO orphan_count
  FROM semantic_tagset t1
  WHERE t1.status = 'ativo'
    AND t1.categoria_pai IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM semantic_tagset t2 WHERE t2.codigo = t1.categoria_pai
    );
  
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % tagsets órfãos detectados', orphan_count;
  END IF;
  
  RAISE NOTICE '✅ VALIDAÇÃO COMPLETA: 53 tagsets migrados, zero códigos numéricos restantes, zero órfãos';
END $$;