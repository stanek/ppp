/* ---------------------------------------------------------------------
 * CONSTANTS
 * -------------------------------------------------------------------*/
const OCTAVE_RANGE = [3, 4];              // C3‒B4 (change to taste)
const NOTE_ORDER   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const GRID_ROWS    = 8;                   // sequencer height
const pianoTable   = document.getElementById('piano');
const gridTable    = document.getElementById('grid');

/* ------------------------------------------------------------------
 * 1 – Sampler: map only A, C, Ds, Fs
 * ----------------------------------------------------------------*/
const SUPPORTED_NOTES = ["A", "C", "D#", "F#"];   // files that exist
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    OCTAVE_RANGE.flatMap(oct =>
      SUPPORTED_NOTES.map(n => {
        const file = (n.replace("#","s") + oct + ".mp3");
        return [`${n}${oct}`, file];
      })
    )
  ),
  release: 1,
  baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();

/* ---------------------------------------------------------------------
 * BUILD PIANO TABLE (3 rows)
 * -------------------------------------------------------------------*/
const octRow   = pianoTable.insertRow();
const noteRow  = pianoTable.insertRow();
const keyRow   = pianoTable.insertRow();

OCTAVE_RANGE.forEach(oct => {
  NOTE_ORDER.forEach(note => {
    const full = `${note}${oct}`;
    const isSharp = note.includes('#');

    // row-1 octave numbers
    octRow.insertCell().textContent = oct;
    octRow.lastChild.className = 'octave';

    // row-2 note names
    noteRow.insertCell().textContent = note.replace('#','♯');
    noteRow.lastChild.className = 'note';

    // row-3 playable key
    const td = keyRow.insertCell();
    const btn = document.createElement('div');
    btn.className = `key ${isSharp ? 'black' : 'white'}`;
    btn.dataset.note = full;
    td.appendChild(btn);
  });
});

/* ---------------------------------------------------------------------
 * KEY HELD-DOWN HANDLING
 * -------------------------------------------------------------------*/
function startNote(note){
  sampler.triggerAttack(note, Tone.now());
}
function stopNote(note){
  sampler.triggerRelease(note, Tone.now());
}

pianoTable.addEventListener('pointerdown', e=>{
  const key = e.target.closest('.key');
  if(!key) return;
  key.classList.add('held');
  startNote(key.dataset.note);
});
window.addEventListener('pointerup', e=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held');
    stopNote(k.dataset.note);
  });
});

/* ---------------------------------------------------------------------
 * SEQUENCER GRID
 * -------------------------------------------------------------------*/
for(let r=0;r<GRID_ROWS;r++){
  const row = gridTable.insertRow();
  for(let c=0;c<NOTE_ORDER.length*(OCTAVE_RANGE.length);c++){
    const cell = row.insertCell();
    cell.addEventListener('click', ()=> cell.classList.toggle('on'));
  }
}
