export function getTeamInitials(team: string): string {
  const chunks = team
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (chunks.length === 0) {
    return '';
  }

  if (chunks.length === 1) {
    return chunks[0].slice(0, 3).toUpperCase();
  }

  return chunks
    .slice(0, 2)
    .map((chunk) => chunk[0].toUpperCase())
    .join('');
}
