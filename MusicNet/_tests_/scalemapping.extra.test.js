// __tests__/scalemapping.extra.test.js
const {
  convertNoteToLevel,
  convertLevelToNote,
  getScale,
  scaleToStepsArray
} = require('../scalemapping/scalemapping');

describe('Scalemapping – extra cases aligned with real code', () => {
  const fundamental = 'C3';
  const ionian = scaleToStepsArray['ionian'];

  test('convertNoteToLevel and convertLevelToNote are inverses for scale notes', () => {
    const scale = getScale(ionian, fundamental);
    scale.forEach(nota => {
      const nivel = convertNoteToLevel(nota);
      const back = convertLevelToNote(nivel);
      expect(back).toBe(nota);
    });
  });

  test('convertNoteToLevel returns 0 for notes not in currentScale', () => {
    expect(convertNoteToLevel('D#4')).toBe(0);
    expect(convertNoteToLevel('H9')).toBe(0);
  });

  test('getScale with empty array returns [NaN]', () => {
    const result = getScale([], 'C4');
    expect(result).toHaveLength(1);
    expect(Number.isNaN(result[0])).toBe(true);
  });

  test('all properties of scaleToStepsArray exist and are arrays', () => {
    Object.keys(scaleToStepsArray).forEach(mode => {
      expect(Array.isArray(scaleToStepsArray[mode])).toBe(true);
    });
  });
});
