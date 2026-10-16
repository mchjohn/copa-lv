-- ADR-03/05/12: fase classificatória vs grande final; leaderboard só classificatória.

ALTER TABLE tournaments
  ADD COLUMN include_final_match boolean NOT NULL DEFAULT false;

UPDATE tournaments
SET include_final_match = true
WHERE players_per_match = 4;

ALTER TABLE matches
  ADD COLUMN phase text NOT NULL DEFAULT 'qualifying'
  CHECK (phase IN ('qualifying', 'final'));

CREATE UNIQUE INDEX matches_one_final_per_tournament_uidx
  ON matches (tournament_id)
  WHERE phase = 'final';

CREATE OR REPLACE VIEW view_leaderboard
WITH (security_invoker = true)
AS
SELECT
  tp.tournament_id,
  p.id AS player_id,
  p.name AS player_name,
  p.avatar_url AS player_avatar,
  COUNT(mp.id) FILTER (WHERE m.status = 'completed' AND m.phase = 'qualifying') AS matches_played,
  COUNT(mp.id) FILTER (WHERE mp.placement = 1 AND m.status = 'completed' AND m.phase = 'qualifying') AS total_wins,
  COALESCE(SUM(mp.points_earned) FILTER (WHERE m.status = 'completed' AND m.phase = 'qualifying'), 0) AS total_points
FROM tournament_players tp
JOIN players p ON tp.player_id = p.id
LEFT JOIN match_players mp ON mp.player_id = p.id
LEFT JOIN matches m ON mp.match_id = m.id AND m.tournament_id = tp.tournament_id
GROUP BY tp.tournament_id, p.id, p.name, p.avatar_url;

GRANT SELECT ON view_leaderboard TO anon, authenticated;
