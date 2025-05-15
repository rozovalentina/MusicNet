// __tests__/scalemapping.test.js
const {
    convertNoteToLevel,
    convertLevelToNote,
    getScale,
    scaleToStepsArray
  } = require('../scalemapping/scalemapping');
  
  describe('Scale Mapping Module', () => {
    test('convertNoteToLevel and convertLevelToNote are inverses', () => {
      const scale = getScale(scaleToStepsArray['ionian'], 'C3');
      scale.forEach((note, idx) => {
        const level = convertNoteToLevel(note);
        const back = convertLevelToNote(level);
        expect(back).toBe(note);
      });
    });
  
    test('getScale returns correct length', () => {
      const scale = getScale(scaleToStepsArray['dorian'], 'A2');
      expect(scale).toHaveLength(8);
      expect(scale[0]).toMatch(/^A2$/);
    });
  
    test('invalid note returns level 0', () => {
      expect(convertNoteToLevel('Z9')).toBe(0);
    });
  });
  