-- Fix 403 after login: authenticated role must have table privileges (RLS filters rows; GRANT allows the role to try).
GRANT SELECT ON tournaments, players, tournament_players, matches, match_players
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON tournaments, players, tournament_players, matches, match_players
  TO authenticated;
