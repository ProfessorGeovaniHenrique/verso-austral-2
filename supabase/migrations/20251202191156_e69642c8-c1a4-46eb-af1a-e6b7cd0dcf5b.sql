-- Sprint 6: Performance Optimization Indexes
-- Add indexes for frequently queried columns to improve query performance

-- Songs table indexes (52k+ rows)
CREATE INDEX IF NOT EXISTS idx_songs_corpus_id ON public.songs(corpus_id);
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_status ON public.songs(status);
CREATE INDEX IF NOT EXISTS idx_songs_normalized_title ON public.songs(normalized_title);
CREATE INDEX IF NOT EXISTS idx_songs_corpus_status ON public.songs(corpus_id, status);

-- Semantic disambiguation cache indexes (13k+ rows)
CREATE INDEX IF NOT EXISTS idx_semantic_cache_palavra ON public.semantic_disambiguation_cache(palavra);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_tagset ON public.semantic_disambiguation_cache(tagset_codigo);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_song_id ON public.semantic_disambiguation_cache(song_id);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_artist_id ON public.semantic_disambiguation_cache(artist_id);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_fonte ON public.semantic_disambiguation_cache(fonte);

-- Artists table indexes (649 rows)
CREATE INDEX IF NOT EXISTS idx_artists_corpus_id ON public.artists(corpus_id);
CREATE INDEX IF NOT EXISTS idx_artists_normalized_name ON public.artists(normalized_name);

-- Semantic tagset indexes (728 rows)
CREATE INDEX IF NOT EXISTS idx_tagset_nivel ON public.semantic_tagset(nivel_profundidade);
CREATE INDEX IF NOT EXISTS idx_tagset_status ON public.semantic_tagset(status);
CREATE INDEX IF NOT EXISTS idx_tagset_categoria_pai ON public.semantic_tagset(categoria_pai);

-- Semantic lexicon indexes (10k rows)
CREATE INDEX IF NOT EXISTS idx_lexicon_palavra ON public.semantic_lexicon(palavra);

-- Gutenberg lexicon indexes (64k rows)  
CREATE INDEX IF NOT EXISTS idx_gutenberg_verbete_norm ON public.gutenberg_lexicon(verbete_normalizado);
CREATE INDEX IF NOT EXISTS idx_gutenberg_classe ON public.gutenberg_lexicon(classe_gramatical);

-- Dialectal lexicon indexes (6k rows)
CREATE INDEX IF NOT EXISTS idx_dialectal_verbete_norm ON public.dialectal_lexicon(verbete_normalizado);
CREATE INDEX IF NOT EXISTS idx_dialectal_tipo ON public.dialectal_lexicon(tipo_dicionario);

-- Annotation jobs indexes
CREATE INDEX IF NOT EXISTS idx_annotation_jobs_status ON public.annotation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_annotation_jobs_user ON public.annotation_jobs(user_id);

-- Semantic annotation jobs indexes  
CREATE INDEX IF NOT EXISTS idx_semantic_jobs_status ON public.semantic_annotation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_semantic_jobs_artist ON public.semantic_annotation_jobs(artist_id);

-- Batch seeding jobs indexes
CREATE INDEX IF NOT EXISTS idx_batch_seeding_status ON public.batch_seeding_jobs(status);