-- Limpar dicionário dialetal para re-importação com novas confianças
DELETE FROM dialectal_lexicon WHERE volume_fonte = 'I';
DELETE FROM dialectal_lexicon WHERE volume_fonte = 'II';