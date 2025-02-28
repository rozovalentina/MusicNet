//# Mapeo de notas musicales a frecuencias.

//Notes permite crear y gestionar una lista de notas en un rango de octavas específico.
const Notes = function(selector, tuner) {
    this.tuner = tuner
    this.isAutoMode = false
    this.$root = document.querySelector(selector)
    //this.$notesList = this.$root.querySelector('.notes-list')
    //this.$frequency = this.$root.querySelector('.frequency')
    this.$notes = []
    this.$notesMap = {}
    this.createNotes()
}

// genera notas desde C2 hasta B5.
Notes.prototype.createNotes = function() {
    const minOctave = 2
    const maxOctave = 5
    for (var octave = minOctave; octave <= maxOctave; octave += 1) {
      for (var n = 0; n < 12; n += 1) {
        const $note = document.createElement('div')
        $note.className = 'note'
        $note.dataset.name = this.tuner.noteStrings[n]
        $note.dataset.value = 12 * (octave + 1) + n
        $note.dataset.octave = octave.toString()
        $note.dataset.frequency = this.tuner.getStandardFrequency(
          $note.dataset.value
        )
        $note.innerHTML =
          $note.dataset.name[0] +
          '<span class="note-sharp">' +
          ($note.dataset.name[1] || '') +
          '</span>' +
          '<span class="note-octave">' +
          $note.dataset.octave +
          '</span>'
        //this.$notesList.appendChild($note)
        this.$notes.push($note)
        this.$notesMap[$note.dataset.value] = $note
      }
    }
  
    const self = this
    this.$notes.forEach(function($note) {
      $note.addEventListener('click', function() {
        if (self.isAutoMode) {
          return
        }
  
        const $active = self.$notesList.querySelector('.active')
        if ($active === this) {
          self.tuner.stop()
          $active.classList.remove('active')
        } else {
          self.tuner.play(this.dataset.frequency)
          //self.update($note.dataset)
        }
      })
    })
}

//habilitar/deshabilitar la selección automática de notas
Notes.prototype.toggleAutoMode = function() {
    if (this.isAutoMode) {
      //this.clearActive()
    }
    this.isAutoMode = !this.isAutoMode
  }
  