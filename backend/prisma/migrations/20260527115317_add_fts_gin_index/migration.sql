CREATE INDEX words_search_gin_idx ON "Word"
USING GIN (
  to_tsvector(
    'pg_catalog.norwegian',
    "headword" || ' ' || coalesce("translation", '')
  )
);
