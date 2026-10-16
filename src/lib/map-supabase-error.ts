import { DomainError } from '@/types/errors'

export function mapSupabaseError(
  error: { code?: string; message: string; status?: number },
  context?: { operation?: 'deletePlayer' },
): DomainError {
  if (error.status === 401 || error.status === 403) {
    return new DomainError('UNAUTHORIZED', 'Faça login para executar esta ação.')
  }
  if (error.code === '42501') {
    return new DomainError('UNAUTHORIZED', 'Faça login para executar esta ação.')
  }
  if (error.code === '23505') {
    const msg = error.message.toLowerCase()
    if (msg.includes('players_name') || msg.includes('players_name_lower')) {
      return new DomainError('PLAYER_NAME_TAKEN', 'Já existe um jogador com este nome.')
    }
  }
  if (error.code === '23503') {
    if (context?.operation === 'deletePlayer') {
      return new DomainError(
        'PLAYER_IN_TOURNAMENT',
        'Não é possível excluir um jogador vinculado a um campeonato.',
      )
    }
    return new DomainError('VALIDATION', error.message)
  }
  if (error.code === 'PGRST116') {
    return new DomainError('NOT_FOUND', 'Registro não encontrado.')
  }
  return new DomainError('VALIDATION', error.message)
}
