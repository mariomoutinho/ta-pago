CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_index_state (
  corpus_key text PRIMARY KEY,
  manifest_hash text NOT NULL,
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL,
  indexed_at timestamptz NOT NULL DEFAULT now(),
  chunk_count integer NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  corpus_key text NOT NULL,
  chunk_id text NOT NULL,
  source_id text NOT NULL,
  source_path text NOT NULL,
  filename text NOT NULL,
  directory text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('code', 'document')),
  symbol text NOT NULL,
  domain text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  index_hash text NOT NULL,
  record jsonb NOT NULL,
  embedding vector(__DIMENSIONS__) NOT NULL,
  embedding_model text NOT NULL,
  embedding_dimensions integer NOT NULL CHECK (embedding_dimensions = __DIMENSIONS__),
  indexed_at timestamptz NOT NULL DEFAULT now(),
  search_text tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', symbol || ' ' || source_path || ' ' || content) ||
    to_tsvector('portuguese', symbol || ' ' || source_path || ' ' || content)
  ) STORED,
  PRIMARY KEY (corpus_key, chunk_id)
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_vector ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS knowledge_chunks_lexical ON knowledge_chunks USING gin (search_text);
CREATE INDEX IF NOT EXISTS knowledge_chunks_symbol ON knowledge_chunks (corpus_key, lower(symbol));
CREATE INDEX IF NOT EXISTS knowledge_chunks_path ON knowledge_chunks (corpus_key, lower(source_path) text_pattern_ops);
CREATE INDEX IF NOT EXISTS knowledge_chunks_filename ON knowledge_chunks (corpus_key, lower(filename));
CREATE INDEX IF NOT EXISTS knowledge_chunks_directory ON knowledge_chunks (corpus_key, lower(directory) text_pattern_ops);
CREATE INDEX IF NOT EXISTS knowledge_chunks_domain ON knowledge_chunks (corpus_key, domain, source_type);
