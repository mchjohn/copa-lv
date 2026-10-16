export type DomainErrorCode =
  | 'UNAUTHORIZED'
  | 'VALIDATION'
  | 'PLAYER_NAME_TAKEN'
  | 'PLAYER_IN_TOURNAMENT'
  | 'TOURNAMENT_NOT_DRAFT'
  | 'ROSTER_FROZEN'
  | 'NOT_ENOUGH_PLAYERS'
  | 'MATCH_NOT_EDITABLE'
  | 'TOURNAMENT_NOT_COMPLETABLE'
  | 'NOT_FOUND'

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly details?: Record<string, unknown>

  constructor(
    code: DomainErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.details = details
  }
}
