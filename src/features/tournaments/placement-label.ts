export function placementLabel(placement: number): string {
  return `${placement}º`
}

export function placementWithPoints(placement: number, points: number): string {
  return `${placementLabel(placement)} · ${points} pts`
}
