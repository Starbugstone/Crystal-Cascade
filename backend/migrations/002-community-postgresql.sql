CREATE TABLE IF NOT EXISTS public_villages (id VARCHAR(32) PRIMARY KEY, player_id VARCHAR(64) NOT NULL UNIQUE, name VARCHAR(160) NOT NULL, era_rank INTEGER NOT NULL, building_score INTEGER NOT NULL, mines_cleared INTEGER NOT NULL, population INTEGER NOT NULL, appearance TEXT NOT NULL, FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS public_villages_rank ON public_villages(era_rank DESC,building_score DESC,mines_cleared DESC,id ASC);
INSERT INTO schema_versions(version) VALUES (2);
