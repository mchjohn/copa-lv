import type { Uuid } from '@/lib/env'
import { DomainError } from '@/types/errors'

export type { Uuid }

export type TournamentStatus = 'draft' | 'in_progress' | 'completed'
export type MatchStatus = 'pending' | 'completed'
export type MatchPhase = 'qualifying' | 'final'
export type PlayersPerMatch = 2 | 3 | 4

export interface Player {
  id: Uuid
  name: string
  avatar_url: string
  created_at: string
}

export interface Tournament {
  id: Uuid
  title: string
  game_name: string
  game_image_url: string
  players_per_match: PlayersPerMatch
  status: TournamentStatus
  created_at: string
}

export interface TournamentPlayer {
  id: Uuid
  tournament_id: Uuid
  player_id: Uuid
  created_at: string
}

export interface Match {
  id: Uuid
  tournament_id: Uuid
  round_number: number
  phase: MatchPhase
  status: MatchStatus
  created_at: string
}

export interface MatchPlayer {
  id: Uuid
  match_id: Uuid
  player_id: Uuid
  placement: number | null
  points_earned: number | null
}

export interface LeaderboardRow {
  tournament_id: Uuid
  player_id: Uuid
  player_name: string
  player_avatar: string
  matches_played: number
  total_wins: number
  total_points: number
}

export interface RankedLeaderboardRow extends LeaderboardRow {
  position: number
}

export interface ScheduledMatch {
  playerIds: Uuid[]
  roundNumber: number
  phase: MatchPhase
}

/** @deprecated use ScheduledMatch */
export type CombinationMatch = ScheduledMatch

export type PointsTable = readonly number[]

export interface PlayerInsert {
  name: string
  avatar_url: string
}

export interface PlayerUpdate {
  name?: string
  avatar_url?: string
}

export interface TournamentInsert {
  title: string
  game_name: string
  game_image_url: string
  players_per_match: PlayersPerMatch
}

export interface SaveMatchResultInput {
  matchId: Uuid
  placements: ReadonlyArray<{ playerId: Uuid; placement: number }>
}

export function asPlayersPerMatch(n: number): PlayersPerMatch {
  if (n === 2 || n === 3 || n === 4) return n
  throw new DomainError('VALIDATION', 'Modalidade inválida.')
}

export const isDraft = (s: TournamentStatus) => s === 'draft'
export const isInProgress = (s: TournamentStatus) => s === 'in_progress'
export const isCompleted = (s: TournamentStatus) => s === 'completed'
