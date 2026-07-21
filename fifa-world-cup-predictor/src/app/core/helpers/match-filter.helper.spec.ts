import { Match } from '../models/match.model';
import {
  DEFAULT_ONGOING_MATCH_WINDOW_MS,
  getAvailableMatches,
  toMexicoCityDateTimeKey
} from './match-filter.helper';

describe('match-filter.helper', () => {
  function makeMatch(homeTeam: string, matchDate: string): Match {
    return {
      homeTeam,
      awayTeam: 'Rival',
      matchStage: 'Group Stage',
      venue: 'Test Venue',
      matchDate
    };
  }

  it('creates sortable Mexico City datetime key', () => {
    const key = toMexicoCityDateTimeKey(new Date('2026-07-21T18:30:45.000Z'));

    expect(key).toMatch(/^\d{14}$/);
  });

  it('filters out matches outside availability window and sorts by date', () => {
    const now = new Date('2026-07-21T12:00:00.000Z');

    const matches: Match[] = [
      makeMatch('Team C', '2026-07-21T13:00:00.000Z'),
      makeMatch('Team A', '2026-07-21T09:30:00.000Z'),
      makeMatch('Team B', '2026-07-21T08:00:00.000Z')
    ];

    const available = getAvailableMatches(matches, now, 3 * 60 * 60 * 1000);

    expect(available.map((match) => match.homeTeam)).toEqual(['Team A', 'Team C']);
  });

  it('uses default availability window when no custom window is provided', () => {
    const now = new Date('2026-07-21T12:00:00.000Z');
    const almostExpiredKickoff = new Date(
      now.getTime() - DEFAULT_ONGOING_MATCH_WINDOW_MS + 60 * 1000
    ).toISOString();

    const available = getAvailableMatches([makeMatch('Team Default', almostExpiredKickoff)], now);

    expect(available).toHaveLength(1);
  });

  it('includes matches at exact window boundary and excludes those already outside', () => {
    const now = new Date('2026-07-21T12:00:00.000Z');
    const exactBoundaryKickoff = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const outsideBoundaryKickoff = new Date(now.getTime() - 3 * 60 * 60 * 1000 - 1000).toISOString();

    const available = getAvailableMatches([
      makeMatch('Boundary Team', exactBoundaryKickoff),
      makeMatch('Expired Team', outsideBoundaryKickoff)
    ], now, 3 * 60 * 60 * 1000);

    expect(available.map((match) => match.homeTeam)).toEqual(['Boundary Team']);
  });
});
