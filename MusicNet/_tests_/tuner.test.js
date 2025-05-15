// __tests__/tuner.test.js
const { Tuner } = require('../pitchdetector/tuner');
// Neutralizamos la llamada a window en Node.js
Tuner.prototype.initGetUserMedia = function() {};

describe('Tuner Module', () => {
  let tuner;

  beforeAll(() => {
    tuner = new Tuner();
    tuner.middleA = 440;
    tuner.semitone = 69;
  });

  test('getStandardFrequency(A4) is approximately 440 Hz', () => {
    const freq = tuner.getStandardFrequency(69);
    expect(freq).toBeCloseTo(440, 1);
  });

  test('getNote maps 440 Hz to MIDI note 69', () => {
    const note = tuner.getNote(440);
    expect(note).toBe(69);
  });

  test('getCents returns zero when perfectly in tune', () => {
    const cents = tuner.getCents(440, 69);
    expect(cents).toBe(0);
  });
});

