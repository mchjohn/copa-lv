export function normalizeTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function isValidTournamentTitle(normalized: string): boolean {
  return normalized.length >= 1 && normalized.length <= 80
}
