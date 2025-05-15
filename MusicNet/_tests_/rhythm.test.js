// __tests__/rhythm.test.js
const { getDurationAndNote, newPattern, statisticalDuration } = require('../rhythm/rhythm');

describe('Rhythm Module', () => {
  test('getDurationAndNote returns a two-element array', () => {
    const [duration, noteLevel] = getDurationAndNote();
    expect(Array.isArray([duration, noteLevel])).toBe(true);
    expect(typeof duration).toBe('number');
  });

  test('newPattern returns non-empty array within bounds', () => {
    const pattern = newPattern();
    expect(Array.isArray(pattern)).toBe(true);
    expect(pattern.length).toBeGreaterThanOrEqual(1);
    pattern.forEach(level => {
      expect(typeof level).toBe('number');
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(8);
    });
  });

  test('statisticalDuration sums to 1', () => {
    const sum = Object.values(statisticalDuration).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 2);
  });
});
