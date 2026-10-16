CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- tournaments
CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  game_name text NOT NULL CHECK (length(btrim(game_name)) > 0),
  game_image_url text NOT NULL CHECK (length(game_image_url) > 0),
  players_per_match integer NOT NULL CHECK (players_per_match IN (2, 3, 4)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tournaments_status_created_at_idx ON tournaments (status, created_at DESC);

-- players
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (name <> '' AND name = btrim(name)),
  avatar_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX players_name_lower_uidx ON players (lower(name));

-- tournament_players
CREATE TABLE tournament_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

-- matches
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments (id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number >= 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX matches_tournament_round_idx ON matches (tournament_id, round_number);

-- match_players
CREATE TABLE match_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players (id) ON DELETE RESTRICT,
  placement integer CHECK (placement IS NULL OR placement BETWEEN 1 AND 4),
  points_earned integer CHECK (points_earned IS NULL OR points_earned >= 0),
  UNIQUE (match_id, player_id),
  CHECK (
    (placement IS NULL AND points_earned IS NULL)
    OR (placement IS NOT NULL AND points_earned IS NOT NULL)
  )
);

CREATE UNIQUE INDEX match_players_match_placement_uidx
  ON match_players (match_id, placement)
  WHERE placement IS NOT NULL;

-- view_leaderboard
CREATE OR REPLACE VIEW view_leaderboard
WITH (security_invoker = true)
AS
SELECT
  tp.tournament_id,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar,
  COUNT(mp.id) FILTER (WHERE m.status = 'completed') AS matches_played,
  COUNT(mp.id) FILTER (WHERE mp.placement = 1 AND m.status = 'completed') AS total_wins,
  COALESCE(SUM(mp.points_earned) FILTER (WHERE m.status = 'completed'), 0) AS total_points
FROM tournament_players tp
JOIN players p ON tp.player_id = p.id
LEFT JOIN match_players mp ON mp.player_id = p.id
LEFT JOIN matches m ON mp.match_id = m.id AND m.tournament_id = tp.tournament_id
GROUP BY tp.tournament_id, p.id, p.name, p.avatar_url;

GRANT SELECT ON view_leaderboard TO anon, authenticated;

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_public ON tournaments FOR SELECT USING (true);
CREATE POLICY write_authenticated_insert ON tournaments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_update ON tournaments FOR UPDATE
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_delete ON tournaments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY select_public ON players FOR SELECT USING (true);
CREATE POLICY write_authenticated_insert ON players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_update ON players FOR UPDATE
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_delete ON players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY select_public ON tournament_players FOR SELECT USING (true);
CREATE POLICY write_authenticated_insert ON tournament_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_update ON tournament_players FOR UPDATE
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_delete ON tournament_players FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY select_public ON matches FOR SELECT USING (true);
CREATE POLICY write_authenticated_insert ON matches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_update ON matches FOR UPDATE
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_delete ON matches FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY select_public ON match_players FOR SELECT USING (true);
CREATE POLICY write_authenticated_insert ON match_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_update ON match_players FOR UPDATE
  USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY write_authenticated_delete ON match_players FOR DELETE USING (auth.role() = 'authenticated');

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('game-covers', 'game-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY avatars_select ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY avatars_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY avatars_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY avatars_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY game_covers_select ON storage.objects FOR SELECT USING (bucket_id = 'game-covers');
CREATE POLICY game_covers_insert ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'game-covers' AND auth.role() = 'authenticated');
CREATE POLICY game_covers_update ON storage.objects FOR UPDATE
  USING (bucket_id = 'game-covers' AND auth.role() = 'authenticated');
CREATE POLICY game_covers_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'game-covers' AND auth.role() = 'authenticated');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;
