//# Controla el ajuste de tonos en tiempo real con aubio.js
const Tuner = function() {
  this.middleA = 440;
  this.semitone = 69;
  this.bufferSize = 4096;
  this.noteStrings = [
    'C', 'C#', 'D', 'D#', 'E', 'F',
    'F#', 'G', 'G#', 'A', 'A#', 'B'
  ];
  this.oscillator = null;
  this.initGetUserMedia();
};

Tuner.prototype.initGetUserMedia = function() {
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!window.AudioContext) {
    return alert('AudioContext not supported');
  }

  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
      if (!getUserMedia) {
        alert('getUserMedia is not implemented in this browser');
      }
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
};

Tuner.prototype.startRecord = function () {
  const self = this;
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(function(stream) {
      self.audioContext.createMediaStreamSource(stream).connect(self.analyser);
      self.analyser.connect(self.scriptProcessor);
      self.scriptProcessor.connect(self.audioContext.destination);
      self.scriptProcessor.addEventListener('audioprocess', function(event) {
        const frequency = self.pitchDetector.do(
          event.inputBuffer.getChannelData(0)
        );
        if (frequency && self.onNoteDetected) {
          const note = self.getNote(frequency);
          self.onNoteDetected({
            name: self.noteStrings[note % 12],
            value: note,
            cents: self.getCents(frequency, note),
            octave: Math.floor(note / 12) - 1,
            frequency: frequency
          });
        }
      });
    })
    .catch(function(error) {
      alert(error.name + ': ' + error.message);
    });
};

Tuner.prototype.init = function() {
  this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  this.analyser = this.audioContext.createAnalyser();
  this.scriptProcessor = this.audioContext.createScriptProcessor(
    this.bufferSize, 1, 1
  );

  const self = this;
  Aubio().then(function(aubio) {
    self.pitchDetector = new aubio.Pitch(
      'default',
      self.bufferSize,
      1,
      self.audioContext.sampleRate
    );
    self.startRecord();
  });
};

Tuner.prototype.getNote = function(frequency) {
  const note = 12 * (Math.log(frequency / this.middleA) / Math.log(2));
  return Math.round(note) + this.semitone;
};

Tuner.prototype.getStandardFrequency = function(note) {
  return this.middleA * Math.pow(2, (note - this.semitone) / 12);
};

Tuner.prototype.getCents = function(frequency, note) {
  return Math.floor(
    (1200 * Math.log(frequency / this.getStandardFrequency(note))) / Math.log(2)
  );
};

Tuner.prototype.play = function(frequency) {
  if (!this.oscillator) {
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.connect(this.analyser);
    this.oscillator.start();
  }
  this.oscillator.frequency.value = frequency;
};

Tuner.prototype.stopPlay = function() {
  stop();
};

function stop() {
  if (this.oscillator != null) {
    this.oscillator.stop();
    this.oscillator = null;
  }
}

// Para las pruebas
module.exports = {
  Tuner
};
