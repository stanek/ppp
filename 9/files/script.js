/* ----------------------------------------------------------------------
 *  CONFIGURATION
 * --------------------------------------------------------------------*/
const OCTAVE_RANGE = [2, 3, 4, 5];               // four octaves
const NOTE_ORDER   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SALAMANDER_SAMPLES = ['A', 'C', 'D#', 'F#']; // files that really exist
const GRID_ROWS    = 8;                          // sequencer height

const pianoTable = document.getElementById('piano');
const gridTable  = document.getElementById('grid');

/* ----------------------------------------------------------------------
 *  TONE.JS SAMPLER – SALAMANDER GRAND
 * --------------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    OCTAVE_RANGE.flatMap(oct =>
      SALAMANDER_SAMPLES.map(n => {
        const file = n.replace('#', 's') + oct + '.mp3';
        return [`${n}${oct}`, file];
      })
    )
  ),
  baseUrl: 'https://tonejs.github.io/audio/salamander/',
  onload: () => console.log('Sampler ready')
}).toDestination();

/* ----------------------------------------------------------------------
 *  BUILD PIANO (octave bar + note names + keys)
 * --------------------------------------------------------------------*/
const octRow  = pianoTable.insertRow();  // row for octave numbers
const noteRow = pianoTable.insertRow();  // row for note labels
const keyRow  = pianoTable.insertRow();  // row for playable keys

OCTAVE_RANGE.forEach(oct => {
  /* Single cell spanning the 12 semitones of this octave */
  const ocCell = octRow.insertCell();
  ocCell.colSpan = NOTE_ORDER.length;       // span across C-B
  ocCell.textContent = oct;
  ocCell.className = 'octave';

  /* Generate the note-label and key cells for this octave */
  NOTE_ORDER.forEach(note => {
    // row 2: note names
    const nCell = noteRow.insertCell();
    nCell.textContent = note.replace('#', '♯');
    nCell.className = 'note';

    // row 3: playable key
    const kCell = keyRow.insertCell();
    const div   = document.createElement('div');
    div.className = `key ${note.includes('#') ? 'black' : 'white'}`;
    div.dataset.note = note + oct;          // e.g. "C#3"
    kCell.appendChild(div);
  });
});

/* ----------------------------------------------------------------------
 *  NOTE-ON / NOTE-OFF (sustain while held)
 * --------------------------------------------------------------------*/
function startNote(note) { sampler.triggerAttack(note, Tone.now()); }
function stopNote(note)  { sampler.triggerRelease(note, Tone.now()); }

pianoTable.addEventListener('pointerdown', e => {
  const key = e.target.closest('.key');
  if (!key) return;
  key.classList.add('held');
  startNote(key.dataset.note);
});

window.addEventListener('pointerup', () => {
  document.querySelectorAll('.key.held').forEach(k => {
    k.classList.remove('held');
    stopNote(k.dataset.note);
  });
});

/* ----------------------------------------------------------------------
 *  SEQUENCER GRID  (columns match number of keys)
 * --------------------------------------------------------------------*/
const COLS = NOTE_ORDER.length * OCTAVE_RANGE.length;

for (let r = 0; r < GRID_ROWS; r++) {
  const row = gridTable.insertRow();
  for (let c = 0; c < COLS; c++) {
    const cell = row.insertCell();
    cell.addEventListener('click', () => cell.classList.toggle('on'));
  }
}
