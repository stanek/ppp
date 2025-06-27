/* ----------------------------------------------------------------------
 *  CONFIGURATION
 * --------------------------------------------------------------------*/
const OCTAVE_RANGE        = [2, 3, 4, 5];
const NOTE_ORDER          = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SALAMANDER_SAMPLES  = ['A','C','D#','F#'];
const GRID_ROWS           = 200;         // ⬅︎ 200 time-steps

/* ----------------------------------------------------------------------
 *  DOM REFERENCES
 * --------------------------------------------------------------------*/
const pianoTable = document.getElementById('piano');
const gridTable  = document.getElementById('grid');

const playBtn   = document.getElementById('playBtn');
const pauseBtn  = document.getElementById('pauseBtn');
const stopBtn   = document.getElementById('stopBtn');
const tempoInput= document.getElementById('tempo');

/* ----------------------------------------------------------------------
 *  BUILD PIANO  (octave bar + labels + keys)
 * --------------------------------------------------------------------*/
const octRow  = pianoTable.insertRow();
const noteRow = pianoTable.insertRow();
const keyRow  = pianoTable.insertRow();

OCTAVE_RANGE.forEach(oct => {
  const ocCell = octRow.insertCell();
  ocCell.colSpan = NOTE_ORDER.length;
  ocCell.textContent = oct;
  ocCell.className = 'octave';

  NOTE_ORDER.forEach(note => {
    // note labels
    const nCell = noteRow.insertCell();
    nCell.textContent = note.replace('#','♯');
    nCell.className = 'note';

    // playable key
    const kCell = keyRow.insertCell();
    const div = document.createElement('div');
    div.className = `key ${note.includes('#') ? 'black':'white'}`;
    div.dataset.note = note + oct;
    kCell.appendChild(div);
  });
});

/* ----------------------------------------------------------------------
 *  BUILD SEQUENCER GRID  (48 cols × 200 rows)
 * --------------------------------------------------------------------*/
const COLS = NOTE_ORDER.length * OCTAVE_RANGE.length;   // 48
for (let r = 0; r < GRID_ROWS; r++) {
  const row = gridTable.insertRow();
  for (let c = 0; c < COLS; c++) {
    const cell = row.insertCell();
    cell.addEventListener('click', () => cell.classList.toggle('on'));
  }
}

/* cursor overlay */
const cursor = document.createElement('div');
cursor.id = 'cursor';
gridTable.appendChild(cursor);

/* cell size in px (matches CSS var) */
const CELL = 26;

/* ----------------------------------------------------------------------
 *  DRAG-SELECT (“lasso”) FOR ON-CELLS
 * --------------------------------------------------------------------*/
let isSelecting   = false;
const selectedSet = new Set();

function clearSelection(){
  selectedSet.forEach(td => td.classList.remove('selected'));
  selectedSet.clear();
}

/* start selection */
gridTable.addEventListener('pointerdown', e=>{
  const td = e.target.closest('td');
  if(!td) return;
  clearSelection();               // drop previous selection
  isSelecting = true;
  if(td.classList.contains('on')){
    td.classList.add('selected');
    selectedSet.add(td);
  }
});

/* extend selection while dragging */
gridTable.addEventListener('pointerover', e=>{
  if(!isSelecting) return;
  const td = e.target.closest('td');
  if(!td || !td.classList.contains('on') || selectedSet.has(td)) return;
  td.classList.add('selected');
  selectedSet.add(td);
});

/* end drag on mouse-up */
window.addEventListener('pointerup', ()=>{ isSelecting = false; });

/* click anywhere outside the grid to clear the orange highlight */
document.addEventListener('pointerdown', e=>{
  if(!gridTable.contains(e.target)) clearSelection();
});


/* ----------------------------------------------------------------------
 *  AUDIO – Tone.Sampler (Salamander Grand)
 * --------------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    OCTAVE_RANGE.flatMap(oct =>
      SALAMANDER_SAMPLES.map(n => {
        const file = n.replace('#','s') + oct + '.mp3';
        return [`${n}${oct}`, file];
      })
    )
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/',
}).toDestination();

/* helper to map column index ➜ note name */
const NOTES_LINEAR = OCTAVE_RANGE.flatMap(oct =>
  NOTE_ORDER.map(n => n + oct)
);

/* ----------------------------------------------------------------------
 *  PLAYBACK ENGINE
 * --------------------------------------------------------------------*/
let rowIdx    = 0;           // current row pointer
let timerId   = null;        // setInterval handle
const heldSet = new Set();   // notes currently sounding

function step() {
  // 1) stop notes that should end
  heldSet.forEach(n => {
    const col = NOTES_LINEAR.indexOf(n);
    if (!gridTable.rows[rowIdx]?.cells[col]?.classList.contains('on')) {
      sampler.triggerRelease(n, Tone.now());
      heldSet.delete(n);
    }
  });

  // 2) start notes in this row that are not yet held
  const cells = gridTable.rows[rowIdx].cells;
  for (let c = 0; c < COLS; c++) {
    if (cells[c].classList.contains('on')) {
      const note = NOTES_LINEAR[c];
      if (!heldSet.has(note)) {
        sampler.triggerAttack(note, Tone.now());
        heldSet.add(note);
      }
    }
  }

  // 3) move red cursor
  cursor.style.transform = `translateY(${rowIdx * CELL}px)`;

  // 4) advance
  rowIdx++;
  if (rowIdx >= GRID_ROWS) stop();          // reached end
}

function play() {
  if (timerId) return;                      // already playing
  const bpm = parseFloat(tempoInput.value) || 120;
  const msPerRow = 60000 / bpm;            // 1 row = 1 beat
  timerId = setInterval(step, msPerRow);
}

function pause() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
  releaseAll();
}

function stop() {
  pause();                                 // stops + releases
  rowIdx = 0;
  cursor.style.transform = 'translateY(-2px)';
}

function releaseAll() {
  heldSet.forEach(n => sampler.triggerRelease(n, Tone.now()));
  heldSet.clear();
}

/* ----------------------------------------------------------------------
 *  MOUSE NOTE PLAY (independent of sequencer)
 * --------------------------------------------------------------------*/
pianoTable.addEventListener('pointerdown', e => {
  const key = e.target.closest('.key');
  if (!key) return;
  key.classList.add('held');
  sampler.triggerAttack(key.dataset.note, Tone.now());
});
window.addEventListener('pointerup', () => {
  document.querySelectorAll('.key.held').forEach(k => {
    k.classList.remove('held');
    sampler.triggerRelease(k.dataset.note, Tone.now());
  });
});

/* ----------------------------------------------------------------------
 *  TRANSPORT BUTTON HOOK-UP
 * --------------------------------------------------------------------*/
playBtn .addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
stopBtn .addEventListener('click', stop);
