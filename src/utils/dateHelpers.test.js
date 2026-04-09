import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  formatTime,
  formatDateTime,
  isOverdue,
  getDaysUntil,
  sortByDateTime,
  groupByDate,
  getTimeSlots,
} from './dateHelpers';

// Pin "now" to 2026-04-09 12:00:00 UTC for deterministic tests
const NOW = new Date('2026-04-09T12:00:00Z');

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe('formatDate', () => {
  it('returns "Today" for today\'s date', () => {
    expect(formatDate('2026-04-09')).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow', () => {
    expect(formatDate('2026-04-10')).toBe('Tomorrow');
  });

  it('returns "Yesterday" for yesterday', () => {
    expect(formatDate('2026-04-08')).toBe('Yesterday');
  });

  it('returns formatted date for other dates', () => {
    expect(formatDate('2026-05-15')).toBe('May 15, 2026');
  });

  it('accepts Date objects', () => {
    expect(formatDate(new Date('2026-04-09T05:00:00Z'))).toBe('Today');
  });
});

describe('formatTime', () => {
  it('converts 24h to 12h format', () => {
    expect(formatTime('08:30')).toBe('8:30 AM');
    expect(formatTime('13:00')).toBe('1:00 PM');
    expect(formatTime('00:15')).toBe('12:15 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('returns empty string for falsy input', () => {
    expect(formatTime('')).toBe('');
    expect(formatTime(null)).toBe('');
    expect(formatTime(undefined)).toBe('');
  });
});

describe('formatDateTime', () => {
  it('combines date and time', () => {
    expect(formatDateTime('2026-04-09', '14:30')).toBe('Today at 2:30 PM');
  });
});

describe('isOverdue', () => {
  it('returns true for past date with no time', () => {
    expect(isOverdue('2026-04-08')).toBe(true);
  });

  it('returns false for future date with no time', () => {
    expect(isOverdue('2026-04-10')).toBe(false);
  });

  it('returns true for today with past time', () => {
    expect(isOverdue('2026-04-09', '08:00')).toBe(true);
  });

  it('returns false for today with future time', () => {
    expect(isOverdue('2026-04-09', '18:00')).toBe(false);
  });
});

describe('getDaysUntil', () => {
  it('returns "Today" for today', () => {
    expect(getDaysUntil('2026-04-09')).toBe('Today');
  });

  it('returns "Tomorrow" for tomorrow', () => {
    expect(getDaysUntil('2026-04-10')).toBe('Tomorrow');
  });

  it('returns "Yesterday" for yesterday', () => {
    expect(getDaysUntil('2026-04-08')).toBe('Yesterday');
  });

  it('returns "In N days" for future dates', () => {
    expect(getDaysUntil('2026-04-12')).toBe('In 3 days');
  });

  it('returns "N days ago" for past dates', () => {
    expect(getDaysUntil('2026-04-06')).toBe('3 days ago');
  });
});

describe('sortByDateTime', () => {
  it('sorts items by date and time ascending', () => {
    const items = [
      { date: '2026-04-10', time: '14:00' },
      { date: '2026-04-09', time: '08:00' },
      { date: '2026-04-10', time: '09:00' },
    ];
    const sorted = sortByDateTime(items);
    expect(sorted[0].time).toBe('08:00');
    expect(sorted[1].time).toBe('09:00');
    expect(sorted[2].time).toBe('14:00');
  });

  it('does not mutate the original array', () => {
    const items = [{ date: '2026-04-10' }, { date: '2026-04-09' }];
    const sorted = sortByDateTime(items);
    expect(sorted).not.toBe(items);
    expect(items[0].date).toBe('2026-04-10');
  });
});

describe('groupByDate', () => {
  it('groups items by formatted date key', () => {
    const items = [
      { date: '2026-04-09', title: 'A' },
      { date: '2026-04-09', title: 'B' },
      { date: '2026-05-01', title: 'C' },
    ];
    const groups = groupByDate(items);
    expect(groups['Today']).toHaveLength(2);
    expect(groups['May 1, 2026']).toHaveLength(1);
  });
});

describe('getTimeSlots', () => {
  it('generates 48 slots for 30-min interval', () => {
    expect(getTimeSlots(30)).toHaveLength(48);
  });

  it('generates 24 slots for 60-min interval', () => {
    expect(getTimeSlots(60)).toHaveLength(24);
  });

  it('caches results', () => {
    const a = getTimeSlots(30);
    const b = getTimeSlots(30);
    expect(a).toBe(b);
  });
});
