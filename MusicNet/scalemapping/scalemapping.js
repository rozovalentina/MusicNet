// Contiene la lógica para mapear escalas modales.

// calulate tones from C2 to A5
var noteFreq = []  //array with the notation note as index and the relative frequency as value
numTones = 49
var tones = []
for(i=0; i<numTones; i++){
  freq = 55*Math.pow(2,1/12)**i
  tones[i] = Number(Math.round(freq+'e2')+'e-2'); // round at second decimals
}

octave = 1
letters = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"]

for(i=0; i<tones.length; i++){
  if(i%12 == 3)
    octave++
  noteLetter = letters[i%12] + octave
  noteFreq[noteLetter] = tones[i]
}

// intervals colors
fundamental = "0xff6b63"; //red
majorThird = "0xffc2bf";  //pink
perfectFifth = "0xff9993";  //light-red
augFourth = "0xebff96"; //yellow
majorInt = "0xffffff";  //majorIntC
minorInt = "0x999cff";  //blue

function playNote(note, duration){
    // example:
    // piano.play('C', 4, 2); -> plays C4 for 2s using the 'piano' sound profile
    if(scaleOnPlay)
      note = playNoteQueue[0]
    name = note.substring(0,note.length-1)
    octave = note.substring(note.length-1, note.length)
    d = Math.abs(duration)
  
    //if(game.scene.isActive("playScene") || gameStatus=="Gameover"){
    if(!game.scene.isActive("pauseScene")){
      pianoInstrument.play(name, octave, d)
  
      if(scaleOnPlay){ //check if i was playing a scale and to manage the pause
        playNoteQueue.shift()
        if(playNoteQueue.length == 0)
          scaleOnPlay = false
        else
          setTimeout(playNote, d/2*1000, null, d)
      }
    }
}


