// __tests__/rhythm.branches.test.js
const { newPattern, getDurationAndNote, statisticalDuration } = require('../rhythm/rhythm');

describe('Rhythm module branches', () => {
  test('newPattern handles strictly descending patterns', () => {
    const originalPatterns = global.patterns;
    global.patterns = [[-1, -1, -1, -1]];
    const pat = newPattern();
    expect(pat.every(n => n >= 1 && n <= 8)).toBe(true);
    global.patterns = originalPatterns;
  });

  test('getDurationAndNote returns a [duration, level] tuple allowing null', () => {
    const [d, lvl] = getDurationAndNote();
    expect(typeof d).toBe('number');
    expect(lvl === null || typeof lvl === 'number').toBe(true);
  });

  test('statisticalDuration sums to 1 and covers all branches', () => {
    const sd = statisticalDuration;
    const sum = Object.values(sd).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(Object.keys(sd).length).toBeGreaterThan(0);
  });
});
