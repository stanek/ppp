/* -------------------------------------------------------------
 *  CONFIG
 * -----------------------------------------------------------*/
const OCTAVE_RANGE = [2,3,4,5];           // now includes 2–5
const NOTE_ORDER   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SUPPORTED    = ['A','C','D#','F#']; // real Salamander samples
const GRID_ROWS    = 8;                   // sequencer height

const pianoTable = document.getElementById('piano');
const gridTable  = document.getElementById('grid');

/* -------------------------------------------------------------
 *  SAMPLER  (Salamander Grand, auto-stretched)
 * -----------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVE_RANGE.flatMap(oct =>
      SUPPORTED.map(n=>{
        const file = (n.replace('#','s')+oct+'.mp3');
        return [`${n}${oct}`,file];
      })
    )
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/',
}).toDestination();

/* -------------------------------------------------------------
 *  BUILD PIANO (3 header rows)
 * -----------------------------------------------------------*/
const octRow  = pianoTable.insertRow();
const noteRow = pianoTable.insertRow();
const keyRow  = pianoTable.insertRow();

OCTAVE_RANGE.forEach(oct=>{
  /* Single cell spanning the 12 semitones of this octave */
  const ocCell = octRow.insertCell();
  ocCell.colSpan = NOTE_ORDER.length;   // 12 columns wide
  ocCell.textContent = oct;
  ocCell.className = 'octave';
  NOTE_ORDER.forEach(note=>{
    const full = note+oct;
    const sharp = note.includes('#');

    // 1️⃣ octave numbers
    octRow.insertCell().textContent = oct;
    octRow.lastChild.className = 'octave';

    // 2️⃣ note names
    noteRow.insertCell().textContent = note.replace('#','♯');
    noteRow.lastChild.className = 'note';

    // 3️⃣ playable key
    const td = keyRow.insertCell();
    const div = document.createElement('div');
    div.className = `key ${sharp?'black':'white'}`;
    div.dataset.note = full;
    td.appendChild(div);
  });
});

/* -------------------------------------------------------------
 *  NOTE ON / OFF (sustain while held)
 * -----------------------------------------------------------*/
function start(note){ sampler.triggerAttack(note, Tone.now()); }
function stop (note){ sampler.triggerRelease(note, Tone.now()); }

pianoTable.addEventListener('pointerdown', e=>{
  const key = e.target.closest('.key');
  if(!key) return;
  key.classList.add('held');
  start(key.dataset.note);
});
window.addEventListener('pointerup', ()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held'); stop(k.dataset.note);
  });
});

/* -------------------------------------------------------------
 *  SEQUENCER GRID  (columns === keys so it lines up)
 * -----------------------------------------------------------*/
const COLS = NOTE_ORDER.length * OCTAVE_RANGE.length;

for(let r=0;r<GRID_ROWS;r++){
  const row = gridTable.insertRow();
  for(let c=0;c<COLS;c++){
    const cell = row.insertCell();
    cell.addEventListener('click',()=>cell.classList.toggle('on'));
  }
}
