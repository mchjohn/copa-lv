export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function isValidPlayerName(normalized: string): boolean {
  return normalized.length >= 1 && normalized.length <= 40
}
