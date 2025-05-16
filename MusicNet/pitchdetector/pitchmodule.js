//Maneja la detección de tono y comunicación con el usuario.
/*
Reference: https://github.com/qiuxiang/tuner
*/

var beforeInJumpArea = false
var lastDetectedNote = null;

const SR             = 44100;
const PACKET_DIM     = 512;
const WINDOW_PACKETS = 16;
   
let pc           = null;
let dataChannel  = null;
let seq          = 0;
let pcmBuffer    = [];

//const OFFER_URL = "http://localhost:8081/offer";
const OFFER_URL = "https://a768-2803-8290-200-1de8-85cf-4dff-cb54-6a8f.ngrok-free.app/offer";

const PitchDetector = function() {
  this.tuner = new Tuner();
  this.notes = new Notes('.notes', this.tuner);
  this.pendingComparison = false;
  //this.update({ name: 'A', frequency: 440, octave: 4, value: 69, cents: 0 })
}

PitchDetector.prototype.start = async function() {

  this.tuner.init();
  this.tuner.onNoteDetected = note => {
    if (!this.notes.isAutoMode) return;
    const musicalNote = note.name + note.octave;
    if (musicalNote !== this.lastLocalNote) {
      this.lastLocalNote = musicalNote;
      newNote(musicalNote);
      this.pendingComparison = true;
      this._sendCurrentWindow();
    }
  };
  
  const stream = this.tuner.stream;  
  if (!stream) {
    console.error("Tuner aún no ha capturado el audio");
    return;
  }

  await this._initWebRTC(stream);

  this._handleStream(stream);
};

PitchDetector.prototype._initWebRTC = async function(stream) {
  pc = new RTCPeerConnection({ iceServers: [ { urls: 'stun:stun.l.google.com:19302' } ] });
  stream.getAudioTracks().forEach(track => {
    pc.addTrack(track, stream);
  });

  dataChannel = pc.createDataChannel("control");
  dataChannel.binaryType = "arraybuffer";
  this._setupDataChannel();

  const offer = await pc.createOffer();

  await pc.setLocalDescription(offer);

  const res = await fetch(OFFER_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sdp: pc.localDescription.sdp,
      type: pc.localDescription.type
    })
  });
  const { sdp, type } = await res.json();
  await pc.setRemoteDescription(new RTCSessionDescription({ sdp, type }));

  pc.oniceconnectionstatechange = () => {
    console.log("ICE connection state:", pc.iceConnectionState);
  };

  pc.ondatachannel = ev => {
    dataChannel = ev.channel;
    this._setupDataChannel();
  };
};

PitchDetector.prototype._setupDataChannel = function() {
  dataChannel.onopen = () => console.log("🟢 DataChannel abierto con PARCnet");
  dataChannel.onmessage = ev => {
    if (!this.pendingComparison) return;
    this.pendingComparison = false;
    try {
      const { note, frequency, loss_rate } = JSON.parse(ev.data);
      if (note === this.lastLocalNote) {
        console.log("✅ Coinciden:", note);
      } else {
        //console.log("❌ Diferencia: local =", this.lastLocalNote, ", servidor =", note);
      }
    } catch (e) {
      console.error("Error procesando mensaje de DataChannel:", e);
    }
  };
  dataChannel.onerror = err => console.error("❌ DataChannel error:", err);
  dataChannel.onclose = () => console.warn("⚠ DataChannel cerrado");
};

PitchDetector.prototype._handleStream = function(stream) {
  const ctx    = this.tuner.audioContext;
  const source = ctx.createMediaStreamSource(stream);
  const proc   = ctx.createScriptProcessor(PACKET_DIM, 1, 1);

  proc.onaudioprocess = e => {
    const float32 = e.inputBuffer.getChannelData(0);
    pcmBuffer.push(float32.buffer);
    if (pcmBuffer.length >= WINDOW_PACKETS) this._sendCurrentWindow();
  };
  source.connect(proc);
  proc.connect(ctx.destination);
  console.log("🟢 AudioProcessor started (SR =", ctx.sampleRate, "Hz)");
};

PitchDetector.prototype._sendCurrentWindow = function() {
  if (!dataChannel || dataChannel.readyState !== 'open') return;
  dataChannel.send(JSON.stringify({ seq: seq++ }));
  // envía el buffer PCM
  const totalLen = pcmBuffer.reduce((a, b) => a + b.byteLength, 0);
  const merged   = new Float32Array(totalLen / 4);
  let offset = 0;
  pcmBuffer.forEach(buf => {
    const view = new Float32Array(buf);
    merged.set(view, offset);
    offset += view.length;
  });
  dataChannel.send(merged.buffer);
  pcmBuffer = [];
};

PitchDetector.prototype.toggleEnable = function() {
  this.notes.toggleAutoMode()
}

PitchDetector.prototype.isEnable = function() {
  return this.notes.isAutoMode
}

PitchDetector.prototype.resumeAudioContext = function() {
  this.tuner.audioContext.resume()
}

//-----------------------------------------------------------------
// INIZIALIZE ALL PITCH DETECTOR
//const pitchDetector = new PitchDetector()
//pitchDetector.start()