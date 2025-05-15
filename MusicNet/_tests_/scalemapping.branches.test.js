// __tests__/scalemapping.branches.test.js
const {
  convertNoteToLevel,
  convertLevelToNote,
  getScale,
  scaleToStepsArray
} = require('../scalemapping/scalemapping');

describe('Scalemapping module branches', () => {
  const fundamental = 'C3';
  const ionian = scaleToStepsArray['ionian'];

  test('convertNoteToLevel returns 1 and 8 for valid scale endpoints', () => {
    const scale = getScale(ionian, fundamental);
    expect(convertNoteToLevel(scale[0])).toBe(1);
    expect(convertNoteToLevel(scale[7])).toBe(8);
  });

  test('convertNoteToLevel returns 0 for notes outside the scale', () => {
    expect(convertNoteToLevel('C0')).toBe(0);
    expect(convertNoteToLevel('B8')).toBe(0);
  });

  test('getScale returns 8 notes for all modes', () => {
    Object.keys(scaleToStepsArray).forEach(mode => {
      const scale = getScale(scaleToStepsArray[mode], fundamental);
      expect(scale).toHaveLength(8);
      expect(scale[0]).toMatch(/^C3$/);
      expect(scale[7]).toMatch(/^C4$/);
    });
  });

  test('getScale returns [NaN] for empty steps array', () => {
    const result = getScale([], 'C4');
    expect(result).toHaveLength(1);
    expect(Number.isNaN(result[0])).toBe(true);
  });
});

  