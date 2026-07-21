import { getTeamInitials } from './team-badge.helper';

describe('team-badge.helper', () => {
  it('returns empty initials for blank team name', () => {
    expect(getTeamInitials('   ')).toBe('');
  });

  it('returns first three characters for single-word team names', () => {
    expect(getTeamInitials('Brazil')).toBe('BRA');
  });

  it('returns initials for multi-word team names', () => {
    expect(getTeamInitials('South Korea')).toBe('SK');
  });

  it('handles separators and trims whitespace', () => {
    expect(getTeamInitials('  Bosnia-and Herzegovina  ')).toBe('BA');
  });
});
