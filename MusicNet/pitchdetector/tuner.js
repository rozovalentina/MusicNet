//# Controla el ajuste de tonos en tiempo real.
const Tuner = function() {
    this.middleA = 440
    this.semitone = 69
    this.bufferSize = 4096
    this.noteStrings = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B'
    ]
    this.oscillator = null
    this.initGetUserMedia()
  }
  
  Tuner.prototype.initGetUserMedia = function() {
    window.AudioContext = window.AudioContext || window.webkitAudioContext
    if (!window.AudioContext) {
      return alert('AudioContext not supported')
    }
  
    // Older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {}
    }
  
    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = function(constraints) {
        // First get ahold of the legacy getUserMedia, if present
        const getUserMedia =
          navigator.webkitGetUserMedia || navigator.mozGetUserMedia
  
        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if (!getUserMedia) {
          alert('getUserMedia is not implemented in this browser')
        }
  
        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise(function(resolve, reject) {
          getUserMedia.call(navigator, constraints, resolve, reject)
        })
      }
    }
  }
  
  
  Tuner.prototype.startRecord = function() {
    const self = this;
    navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(function(stream) {
            const source = self.audioContext.createMediaStreamSource(stream);
            source.connect(self.analyser);
            
            // Inicializar el detector de pitch en el worklet
            self.pitchWorklet.port.postMessage({
                type: 'init',
                bufferSize: self.bufferSize,
                sampleRate: self.audioContext.sampleRate
            });
        })
        .catch(function(error) {
            alert(error.name + ': ' + error.message);
        });
};
  
  
Tuner.prototype.init = function() {
  try {
    // Crear el contexto de audio
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Configurar el analizador
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = this.bufferSize;
    
    // Intentar usar AudioWorklet (método moderno)
    if (this.audioContext.audioWorklet && typeof this.audioContext.audioWorklet.addModule === 'function') {
      return this._initWithAudioWorklet();
    } else {
      // Fallback a ScriptProcessorNode (método obsoleto pero compatible)
      console.warn('AudioWorklet no está disponible, usando ScriptProcessorNode (obsoleto)');
      return this._initWithScriptProcessor();
    }
  } catch (error) {
    console.error('Error al inicializar el tuner:', error);
    throw new Error('No se pudo inicializar el sistema de audio: ' + error.message);
  }
};

// Implementación con AudioWorklet (recomendado)
Tuner.prototype._initWithAudioWorklet = function() {
  const self = this;
  const workletPath = 'pitchdetector/pitch-processor.js'; // Ajusta esta ruta según tu estructura de archivos
  
  return this.audioContext.audioWorklet.addModule(workletPath)
    .then(() => {
      console.log('Módulo AudioWorklet cargado correctamente');
      
      // Crear el nodo worklet
      this.pitchWorklet = new AudioWorkletNode(this.audioContext, 'pitch-processor', {
        processorOptions: {
          bufferSize: this.bufferSize,
          sampleRate: this.audioContext.sampleRate
        }
      });
      
      // Configurar conexiones
      this.analyser.connect(this.pitchWorklet);
      
      // Manejar mensajes del worklet
      this.pitchWorklet.port.onmessage = (event) => {
        if (event.data.frequency && self.onNoteDetected) {
          const note = self.getNote(event.data.frequency);
          self.onNoteDetected({
            name: self.noteStrings[note % 12],
            value: note,
            cents: self.getCents(event.data.frequency, note),
            octave: parseInt(note / 12) - 1,
            frequency: event.data.frequency
          });
        }
      };
      
      // Iniciar la grabación
      return this.startRecord();
    })
    .catch(error => {
      console.error('Error al cargar AudioWorklet:', error);
      // Fallback a ScriptProcessorNode si falla
      return this._initWithScriptProcessor();
    });
};

// Implementación con ScriptProcessorNode (fallback)
Tuner.prototype._initWithScriptProcessor = function() {
  const self = this;
  
  console.warn('Usando ScriptProcessorNode (obsoleto) como fallback');
  
  // Crear el script processor
  this.scriptProcessor = this.audioContext.createScriptProcessor(
    this.bufferSize, 1, 1
  );
  
  // Configurar conexiones
  this.analyser.connect(this.scriptProcessor);
  this.scriptProcessor.connect(this.audioContext.destination);
  
  // Configurar el manejador de procesamiento de audio
  this.scriptProcessor.onaudioprocess = function(event) {
    try {
      const frequency = self.pitchDetector.do(
        event.inputBuffer.getChannelData(0)
      );
      
      if (frequency && self.onNoteDetected) {
        const note = self.getNote(frequency);
        self.onNoteDetected({
          name: self.noteStrings[note % 12],
          value: note,
          cents: self.getCents(frequency, note),
          octave: parseInt(note / 12) - 1,
          frequency: frequency
        });
      }
    } catch (e) {
      console.error('Error en el procesamiento de audio:', e);
    }
  };
  
  // Iniciar la grabación
  return Promise.resolve(this.startRecord());
};
  
  /**
   * get musical note from frequency
   *
   * @param {number} frequency
   * @returns {number}
   */
  Tuner.prototype.getNote = function(frequency) {
    const note = 12 * (Math.log(frequency / this.middleA) / Math.log(2))
    return Math.round(note) + this.semitone
  }
  
  /**
   * get the musical note's standard frequency
   *
   * @param note
   * @returns {number}
   */
  Tuner.prototype.getStandardFrequency = function(note) {
    return this.middleA * Math.pow(2, (note - this.semitone) / 12)
  }
  
  /**
   * get cents difference between given frequency and musical note's standard frequency
   *
   * @param {number} frequency
   * @param {number} note
   * @returns {number}
   */
  Tuner.prototype.getCents = function(frequency, note) {
    return Math.floor(
      (1200 * Math.log(frequency / this.getStandardFrequency(note))) / Math.log(2)
    )
  }
  
  /**
   * play the musical note
   *
   * @param {number} frequency
   */
  Tuner.prototype.play = function(frequency) {
    if (!this.oscillator) {
      this.oscillator = this.audioContext.createOscillator()
      //this.oscillator.connect(this.audioContext.destination)
      this.oscillator.connect(this.analyser)
      this.oscillator.start()
    }
    this.oscillator.frequency.value = frequency
    //console.log(this.oscillator)
    //setTimeout(stop, 1000)
  }
  
  Tuner.prototype.stopPlay = function() {
    stop()
  }
  
  function stop(){
    //console.log(this.oscillator)
    if(this.oscillator!=null){
      this.oscillator.stop()
      this.oscillator = null
      //console.log("STOP")
    }
  }

  function encodeWAV(samples, sampleRate) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    const sampleLength = samples.length;
    const fileLength = sampleLength * 2 + 36;

    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
    view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
    view.setUint16(22, 1, true);  // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(view, 36, 'data');
    view.setUint32(40, sampleLength * 2, true);

    let offset = 44;
    for (let i = 0; i < sampleLength; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

  