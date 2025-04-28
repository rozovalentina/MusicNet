// pitch-processor.js
// En pitch-processor.js
class PitchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lastPhase = 0;
        this.sampleRate = 44100; // Se actualizará con el mensaje init
    }

    // Implementación básica de autocorrelación para detección de pitch
    detectPitch(buffer) {
        const maxOffset = Math.floor(this.sampleRate / 50); // Mínimo ~50Hz
        const minOffset = Math.floor(this.sampleRate / 2000); // Máximo ~2000Hz
        
        let bestOffset = 0;
        let bestCorrelation = 0;
        
        for (let offset = minOffset; offset < maxOffset; offset++) {
            let correlation = 0;
            for (let i = 0; i < buffer.length - offset; i++) {
                correlation += buffer[i] * buffer[i + offset];
            }
            
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        }
        
        return bestOffset > 0 ? this.sampleRate / bestOffset : null;
    }

    process(inputs) {
        if (!inputs[0]?.[0]) return true;
        
        const frequency = this.detectPitch(inputs[0][0]);
        if (frequency) {
            this.port.postMessage({ frequency });
        }
        
        return true;
    }
}

registerProcessor('pitch-processor', PitchProcessor);