//Maneja la detección de tono y comunicación con el usuario.
/*
Reference: https://github.com/qiuxiang/tuner
*/

var beforeInJumpArea = false
var lastDetectedNote = null;

const PitchDetector = function() {
  this.tuner = new Tuner()
  this.notes = new Notes('.notes', this.tuner)
  //this.update({ name: 'A', frequency: 440, octave: 4, value: 69, cents: 0 })
}

PitchDetector.prototype.start = function() {
  const self = this

  self.tuner.init()
  setTimeout(() => {
    if (self.tuner.analyser) {
      self.frequencyData = new Uint8Array(self.tuner.analyser.frequencyBinCount);
    }
  }, 500);


  this.tuner.onNoteDetected = function(note) {
    if (self.notes.isAutoMode) {
      if (self.lastNote === note.name && self.lastOctave === note.octave) {
        //self.update(note)
        //stessa nota della precedente (approssimata in centesimi)
        //DURATA DELLA NOTA
        // -> qui posso rilevare i centesimi di divverenza

        musicalNote = note.name + note.octave
        //console.log("SAME NOTE:" + musicalNote)


      } else {
        self.lastNote = note.name
        self.lastOctave = note.octave

        musicalNote = note.name + note.octave
        //console.log(musicalNote)
        // CALL ScaleMapping Module
        lastDetectedNote = musicalNote;
        self.lastLocalNote = musicalNote;
        newNote(musicalNote)
        //self.lastNote = null
        self.detectRemoteNote();
        
      }

      //se sono a ridosso di un salto "azzero" il pitch per poter eventualmente cantare la stessa nota
      // eseguo questo codice solamente la prima volte che entro nella jumpArea (e rilevo un pitch)
      if(jumpArea && !beforeInJumpArea){
        //console.log("JumpArea")
        beforeInJumpArea = true
        self.lastNote = null
        self.lastOctave = null
      }

      if(!jumpArea)
        beforeInJumpArea = false
    }
  }

  
}

PitchDetector.prototype.detectRemoteNote = async function() {
  try {
    const resultado = await grabarYEnviarAudio();
    if (resultado.note) {
      console.log("🎼 Nota detectada en servidor:", resultado.note);

      // Comparar con la nota local más reciente
      if (resultado.note === this.lastLocalNote) {
        console.log("✅ Coinciden: nota local y remota son iguales:", resultado.note);
      } else {
        console.log("❌ Diferencia: local =", this.lastLocalNote, ", servidor =", resultado.note);
      }

    } else {
      console.warn("⚠️ No se detectó ninguna nota en el servidor.");
    }
  } catch (err) {
    console.error("❌ Error al enviar audio al servidor:", err);
  }
};

async function grabarYEnviarAudio() {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append("audio", audioBlob, "nota.webm");

        try {
          const response = await fetch("http://localhost:8081/detect_note", {
            method: "POST",
            body: formData
          });
          const result = await response.json();
          resolve(result); // {note: "C4", frequency: 261.63}
        } catch (error) {
          reject(error);
        }
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 1000); // Graba 1 segundo
    });
  });
}


/*
PitchDetector.prototype.update = function(note) {
  this.notes.update(note)
  this.meter.update((note.cents / 50) * 45)
}*/

// enable or disable the detection
PitchDetector.prototype.toggleEnable = function() {
  this.notes.toggleAutoMode()
}

PitchDetector.prototype.isEnable = function() {
  return this.notes.isAutoMode
}

// this method is for the upgrade of AudioContext (December 2018)
PitchDetector.prototype.resumeAudioContext = function() {
  this.tuner.audioContext.resume()
}

//-----------------------------------------------------------------
// INIZIALIZE ALL PITCH DETECTOR
//const pitchDetector = new PitchDetector()
//pitchDetector.start()