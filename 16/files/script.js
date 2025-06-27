/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES  = [2, 3, 4, 5];
const NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLES  = ['A','C','D#','F#'];       // actual mp3 files
const ROWS     = 200;
const COLS     = NAMES.length * OCTAVES.length;      // 48
const CELL_PX  = 26;                                  // CSS --cell

/* ------------------------------------------------------------------
 * DOM
 * ----------------------------------------------------------------*/
const piano  = document.getElementById('piano');
const grid   = document.getElementById('grid');
const playB  = document.getElementById('playBtn');
const pauseB = document.getElementById('pauseBtn');
const stopB  = document.getElementById('stopBtn');
const tempo  = document.getElementById('tempo');

/* ------------------------------------------------------------------
 * BUILD PIANO HEADER
 * ----------------------------------------------------------------*/
const octRow = piano.insertRow();
const labRow = piano.insertRow();
const keyRow = piano.insertRow();

OCTAVES.forEach(oct => {
  const oc = octRow.insertCell();
  oc.colSpan = NAMES.length; oc.textContent = oct; oc.className = 'octave';

  NAMES.forEach(n => {
    labRow.insertCell().textContent = n.replace('#', '♯');
    labRow.lastChild.className = 'note';

    const kc = keyRow.insertCell();
    const div = document.createElement('div');
    div.className = `key ${n.includes('#') ? 'black' : 'white'}`;
    div.dataset.note = n + oct;
    kc.appendChild(div);
  });
});

/* ------------------------------------------------------------------
 * BUILD GRID
 * ----------------------------------------------------------------*/
for (let r = 0; r < ROWS; r++) {
  const row = grid.insertRow();
  for (let c = 0; c < COLS; c++) row.insertCell();
}

/* overlays */
const cursor = Object.assign(document.createElement('div'), { id: 'cursor' });
const lasso  = Object.assign(document.createElement('div'), { id: 'lasso'  });
grid.append(cursor, lasso);

/* linear col → note map */
const NOTES = OCTAVES.flatMap(o => NAMES.map(n => n + o));

/* ------------------------------------------------------------------
 * SAMPLER (Salamander Grand)
 * ----------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    OCTAVES.flatMap(o => SAMPLES.map(n => [`${n}${o}`, n.replace('#', 's') + o + '.mp3']))
  ),
  baseUrl: 'https://tonejs.github.io/audio/salamander/'
}).toDestination();

/* ------------------------------------------------------------------
 * PLAYBACK
 * ----------------------------------------------------------------*/
let ptr = 0, timer = null, held = new Set();

function step() {
  /* release */
  held.forEach(n => {
    const col = NOTES.indexOf(n);
    if (!grid.rows[ptr]?.cells[col]?.classList.contains('on')) {
      sampler.triggerRelease(n, Tone.now());
      held.delete(n);
    }
  });

  /* attack */
  const cells = grid.rows[ptr].cells;
  for (let c = 0; c < COLS; c++) {
    if (cells[c].classList.contains('on') && !held.has(NOTES[c])) {
      sampler.triggerAttack(NOTES[c], Tone.now());
      held.add(NOTES[c]);
    }
  }

  cursor.style.transform = `translateY(${ptr * CELL_PX}px)`;
  if (++ptr >= ROWS) stop();
}

function play()  { if (timer) return; timer = setInterval(step, 60000 / (+tempo.value || 120)); }
function pause() { if (!timer) return; clearInterval(timer); timer = null; releaseAll(); }
function stop()  { pause(); ptr = 0; cursor.style.transform = 'translateY(-2px)'; }
function releaseAll() { held.forEach(n => sampler.triggerRelease(n, Tone.now())); held.clear(); }

/* ------------------------------------------------------------------
 * SELECTION + DRAG LOGIC
 * ----------------------------------------------------------------*/
const selection = new Set();    // committed orange notes
let   tempSel   = new Set();    // live during active drag
let   pointerDown   = false;    // mouse button held?
let   dragActive    = false;    // have we moved off origin cell?
let   startRow = 0, startCol = 0;   // drag origin

function clearSelection() {
  selection.forEach(td => td.classList.remove('selected'));
  selection.clear();
}

/* helper: update lasso box & temp highlight */
function showLasso(minR, minC, maxR, maxC) {
  lasso.style.display = 'block';
  lasso.style.left   = minC * CELL_PX + 'px';
  lasso.style.top    = minR * CELL_PX + 'px';
  lasso.style.width  = (maxC - minC + 1) * CELL_PX + 'px';
  lasso.style.height = (maxR - minR + 1) * CELL_PX + 'px';
}

function updateTemp(minR, minC, maxR, maxC) {
  tempSel.forEach(td => td.classList.remove('selected'));
  tempSel.clear();
  for (let r = minR; r <= maxR; r++) {
    const row = grid.rows[r];
    for (let c = minC; c <= maxC; c++) {
      const td = row.cells[c];
      if (td.classList.contains('on')) {
        td.classList.add('selected');
        tempSel.add(td);
      }
    }
  }
}

/* ------------------------------------------------------------------
 * GRID EVENTS
 * ----------------------------------------------------------------*/
grid.addEventListener('pointerdown', e => {
  const td = e.target.closest('td');
  if (!td) return;

  pointerDown = true;
  dragActive  = false;          // we don't know yet if it will be a drag
  startRow    = td.parentNode.rowIndex;
  startCol    = td.cellIndex;

  /* If something is already selected we DO NOT toggle; click is for clearing */
  if (selection.size) return;

  /* otherwise, we wait for pointerup (click) or drag-over to decide */
});

grid.addEventListener('pointerover', e => {
  if (!pointerDown) return;
  const td = e.target.closest('td'); if (!td) return;

  const curRow = td.parentNode.rowIndex, curCol = td.cellIndex;

  /* If we've moved into a DIFFERENT cell, we activate drag-select. */
  if (!dragActive && (curRow !== startRow || curCol !== startCol)) {
    dragActive = true;
    lasso.style.display = 'block';
  }

  if (dragActive) {
    const minR = Math.min(startRow, curRow), maxR = Math.max(startRow, curRow);
    const minC = Math.min(startCol, curCol), maxC = Math.max(startCol, curCol);
    showLasso(minR, minC, maxR, maxC);
    updateTemp(minR, minC, maxR, maxC);
  }
});

window.addEventListener('pointerup', e => {
  if (!pointerDown) return;
  pointerDown = false;

  if (dragActive) {                 // we performed a selection drag
    dragActive = false;
    lasso.style.display = 'none';
    clearSelection();               // replace any old selection
    tempSel.forEach(td => selection.add(td));
    tempSel.clear();
    return;
  }

  /* ⇣ If we reach here, it was a simple click (no drag) ⇣ */
  const td = e.target.closest?.('td');
  if (!td) return;                  // click happened outside grid

  if (selection.size) {             // first click after selection → clear
    clearSelection();
    return;
  }

  /* normal toggle */
  td.classList.toggle('on');
});

/* click outside grid clears selection */
document.addEventListener('pointerdown', e => {
  if (!grid.contains(e.target)) clearSelection();
});
/* Esc clears selection */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') clearSelection();
});

/* ------------------------------------------------------------------
 * MOVE SELECTION WITH ARROW KEYS
 * ----------------------------------------------------------------*/
document.addEventListener('keydown', e => {
  if (!selection.size) return;
  if (e.target.tagName === 'INPUT') return;

  let dR = 0, dC = 0;
  switch (e.key) {
    case 'ArrowUp'   : dR = -1; break;
    case 'ArrowDown' : dR =  1; break;
    case 'ArrowLeft' : dC = -1; break;
    case 'ArrowRight': dC =  1; break;
    default: return;
  }
  e.preventDefault();

  /* boundary check */
  for (const td of selection) {
    const r = td.parentNode.rowIndex + dR, c = td.cellIndex + dC;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
  }

  const next = new Set();
  selection.forEach(td => {
    const r = td.parentNode.rowIndex, c = td.cellIndex;
    const dest = grid.rows[r + dR].cells[c + dC];
    td.classList.remove('on', 'selected');
    dest.classList.add('on', 'selected');
    next.add(dest);
  });
  selection.clear(); next.forEach(td => selection.add(td));
});

/* ------------------------------------------------------------------
 * MANUAL PIANO PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown', e => {
  const k = e.target.closest('.key'); if (!k) return;
  k.classList.add('held'); sampler.triggerAttack(k.dataset.note, Tone.now());
});
window.addEventListener('pointerup', () => {
  document.querySelectorAll('.key.held').forEach(k => {
    k.classList.remove('held');
    sampler.triggerRelease(k.dataset.note, Tone.now());
  });
});

/* ------------------------------------------------------------------
 * TRANSPORT BUTTONS
 * ----------------------------------------------------------------*/
playB .addEventListener('click', play );
pauseB.addEventListener('click', pause);
stopB .addEventListener('click', stop );
