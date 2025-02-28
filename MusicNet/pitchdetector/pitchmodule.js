//Maneja la detección de tono y comunicación con el usuario.

const PitchDetector = function() {
    this.tuner = new Tuner()
    this.notes = new Notes('.notes', this.tuner)
    //this.update({ name: 'A', frequency: 440, octave: 4, value: 69, cents: 0 })
}

//activan o desactivan la detección automática
PitchDetector.prototype.toggleEnable = function() {
    this.notes.toggleAutoMode()
}
  
PitchDetector.prototype.isEnable = function() {
    return this.notes.isAutoMode
}