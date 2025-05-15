// __tests__/tuner.edge.test.js
const { Tuner } = require('../pitchdetector/tuner');

describe('Tuner initGetUserMedia edge cases', () => {
  let originalAlert, originalWindow, originalNavigator;

  beforeAll(() => {
    originalAlert     = global.alert;
    originalWindow    = global.window;
    originalNavigator = global.navigator;
  });

  afterAll(() => {
    global.alert     = originalAlert;
    global.window    = originalWindow;
    global.navigator = originalNavigator;
  });

  test('alerts if no AudioContext in window', () => {
    global.window    = {};
    global.navigator = {};
    const spyAlert = jest.fn();
    global.alert = spyAlert;
    new Tuner();

    expect(spyAlert).toHaveBeenCalledWith('AudioContext not supported');
  });

  test('defines window.AudioContext when only webkitAudioContext exists', () => {
    global.window    = { webkitAudioContext: function WK() {} };
    global.navigator = {};
    const spyAlert = jest.fn();
    global.alert = spyAlert;

    new Tuner();

    expect(typeof window.AudioContext).toBe('function');
    expect(spyAlert).not.toHaveBeenCalled();
  });
});
