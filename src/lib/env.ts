export type Uuid = string

export function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}
