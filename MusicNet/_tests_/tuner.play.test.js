// __tests__/tuner.play.test.js

describe('Tuner init and play/stop', () => {
  let Tuner, tuner;

  beforeAll(() => {
    global.alert = jest.fn();

    class MockAnalyser { connect() {} }
    class MockScriptProcessor {
      constructor() { this.onaudioprocess = null; }
      connect() {}
      addEventListener() {}
      removeEventListener() {}
    }
    class MockMediaStreamSource { connect() {} }
    class MockOscillator {
      constructor() { this.frequency = { value: 0 }; }
      connect() {}
      start() {}
      stop() {}
    }
    class MockCtx {
      createAnalyser() { return new MockAnalyser(); }
      createScriptProcessor() { return new MockScriptProcessor(); }
      createMediaStreamSource() { return new MockMediaStreamSource(); }
      createOscillator() { return new MockOscillator(); }
      get destination() { return {}; }
      get sampleRate() { return 44100; }
    }

    global.window = { AudioContext: MockCtx };
    global.navigator = { mediaDevices: { getUserMedia: jest.fn().mockResolvedValue({}) } };
    global.Aubio = jest.fn().mockResolvedValue({ Pitch: class {} });

    ({ Tuner } = require('../pitchdetector/tuner'));
  });

  afterAll(() => {
    delete global.window;
    delete global.navigator;
    delete global.Aubio;
    delete global.alert;
  });

  beforeEach(() => {
    tuner = new Tuner();
    tuner.init();
  });

  test('init creates audioContext, analyser and scriptProcessor', () => {
    expect(tuner.audioContext).toBeInstanceOf(window.AudioContext);
    expect(tuner.analyser).toBeDefined();
    expect(tuner.scriptProcessor).toBeDefined();
  });

  test('play initializes oscillator and sets frequency', () => {
    expect(tuner.oscillator).toBeNull();
    tuner.play(440);
    expect(tuner.oscillator).toBeDefined();
    expect(tuner.oscillator.frequency.value).toBe(440);
  });

  test('stopPlay does not throw and leaves oscillator defined', () => {
    tuner.play(330);
    expect(() => tuner.stopPlay()).not.toThrow();
    expect(tuner.oscillator).toBeDefined();
  });
});
