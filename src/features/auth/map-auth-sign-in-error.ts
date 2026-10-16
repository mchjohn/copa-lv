export const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.'
export const GENERIC_LOGIN_ERROR_MESSAGE = 'Não foi possível entrar.'

export function mapAuthSignInError(error: { message: string }): {
  formMessage?: string
  toastMessage: string
} {
  if (error.message === 'Invalid login credentials') {
    return {
      formMessage: INVALID_CREDENTIALS_MESSAGE,
      toastMessage: INVALID_CREDENTIALS_MESSAGE,
    }
  }
  return { toastMessage: GENERIC_LOGIN_ERROR_MESSAGE }
}
