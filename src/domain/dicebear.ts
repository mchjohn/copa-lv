export function dicebearAvatarUrl(normalizedName: string): string {
  const seed = encodeURIComponent(normalizedName)
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`
}
