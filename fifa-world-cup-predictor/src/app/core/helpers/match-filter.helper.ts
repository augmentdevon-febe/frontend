import { Match } from '../models/match.model';

export const DEFAULT_ONGOING_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000;

const mexicoCityDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Mexico_City',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23'
});

export function toMexicoCityDateTimeKey(date: Date): string {
  const parts = mexicoCityDateTimeFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value || '00';

  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  const hour = pick('hour');
  const minute = pick('minute');
  const second = pick('second');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

export function getAvailableMatches(
  matches: Match[],
  now: Date = new Date(),
  ongoingMatchWindowMs: number = DEFAULT_ONGOING_MATCH_WINDOW_MS
): Match[] {
  const nowMexicoCityKey = toMexicoCityDateTimeKey(now);

  return matches
    .filter((match) => {
      const kickoff = new Date(match.matchDate);
      const availableUntil = new Date(kickoff.getTime() + ongoingMatchWindowMs);

      return toMexicoCityDateTimeKey(availableUntil) >= nowMexicoCityKey;
    })
    .sort((firstMatch, secondMatch) => {
      const firstDate = new Date(firstMatch.matchDate).getTime();
      const secondDate = new Date(secondMatch.matchDate).getTime();

      return firstDate - secondDate;
    });
}
