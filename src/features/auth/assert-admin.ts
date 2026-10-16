import { DomainError } from '@/types/errors'

export function assertAdmin(isAdmin: boolean): void {
  if (!isAdmin) {
    throw new DomainError('UNAUTHORIZED', 'Faça login para executar esta ação.')
  }
}
