CREATE TABLE IF NOT EXISTS library_items (
 id text PRIMARY KEY,
 title text NOT NULL CHECK(length(title) BETWEEN 1 AND 180),
 composer text NOT NULL DEFAULT '',
 instrument text NOT NULL CHECK(instrument IN ('piano','guitar','bass','sax','harmonica','drums','singing')),
 kind text NOT NULL CHECK(kind IN ('primer','lesson','song','etude','jazz-study','tune-index','import')),
 level smallint NOT NULL CHECK(level BETWEEN 1 AND 5),
 description text NOT NULL DEFAULT '',
 tags text[] NOT NULL DEFAULT '{}',
 bpm integer NOT NULL CHECK(bpm BETWEEN 30 AND 240),
 meter text NOT NULL DEFAULT '4/4',
 tonality text NOT NULL DEFAULT 'C major',
 rights text NOT NULL,
 source_url text NOT NULL DEFAULT '',
 source_name text NOT NULL DEFAULT '',
 playable boolean NOT NULL DEFAULT true,
 score jsonb,
 sort_order integer NOT NULL DEFAULT 0,
 origin text NOT NULL CHECK(origin IN ('curated','user')),
 created_at timestamptz NOT NULL DEFAULT now(),
 search_document tsvector GENERATED ALWAYS AS (
 setweight(to_tsvector('simple',title || ' ' || composer),'A') ||
 setweight(to_tsvector('simple',description),'B')
 ) STORED,
 CHECK((playable AND score IS NOT NULL) OR (NOT playable AND score IS NULL))
);
CREATE INDEX IF NOT EXISTS library_search_idx ON library_items USING gin(search_document);
CREATE INDEX IF NOT EXISTS library_filter_idx ON library_items(instrument,kind,level);
CREATE INDEX IF NOT EXISTS library_tags_idx ON library_items USING gin(tags);

-- Extend existing local libraries while preserving all imported music.
ALTER TABLE library_items DROP CONSTRAINT IF EXISTS library_items_instrument_check;
ALTER TABLE library_items ADD CONSTRAINT library_items_instrument_check CHECK(instrument IN ('piano','guitar','bass','sax','harmonica','drums','singing'));
