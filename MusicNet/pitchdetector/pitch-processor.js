class PitchProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.sampleRate = options.processorOptions.sampleRate || 44100;
    }

    detectPitch(buffer) {
        const maxOffset = Math.floor(this.sampleRate / 50);
        const minOffset = Math.floor(this.sampleRate / 2000);

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
