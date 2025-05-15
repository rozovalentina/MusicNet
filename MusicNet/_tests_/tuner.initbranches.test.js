// __tests__/tuner.initbranches.test.js
const { Tuner } = require('../pitchdetector/tuner');

describe('initGetUserMedia advanced branches', () => {
  let originalWindow, originalNavigator, originalAlert;

  beforeAll(() => {
    originalWindow = global.window;
    originalNavigator = global.navigator;
    originalAlert = global.alert;
    global.alert = jest.fn();
  });

  afterAll(() => {
    global.window = originalWindow;
    global.navigator = originalNavigator;
    global.alert = originalAlert;
  });

  test('creates navigator.mediaDevices if missing', () => {
    global.window = { AudioContext: jest.fn() };
    global.navigator = {};
    new Tuner();
    expect(navigator.mediaDevices).toBeDefined();
    expect(typeof navigator.mediaDevices.getUserMedia).toBe('function');
  });

  test('alerts if getUserMedia is not implemented', () => {
    global.window = { AudioContext: jest.fn() };
    global.navigator = { mediaDevices: {} };
    delete navigator.webkitGetUserMedia;
    delete navigator.mozGetUserMedia;
    const spy = jest.fn();
    global.alert = spy;
    new Tuner();
    return navigator.mediaDevices.getUserMedia({ audio: true })
      .catch(() => {
        expect(spy).toHaveBeenCalledWith('getUserMedia is not implemented in this browser');
      });
  });
});
