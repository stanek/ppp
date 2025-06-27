/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES  = [2, 3, 4, 5];
const NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLES  = ['A','C','D#','F#'];              // real Salamander files
const ROWS     = 200;
const COLS     = OCTAVES.length * NAMES.length;
const CELL_PX  = 26;

/* ------------------------------------------------------------------
 * DOM
 * ----------------------------------------------------------------*/
const piano      = document.getElementById('piano');
const grid       = document.getElementById('grid');
const playBtn    = document.getElementById('playBtn');
const pauseBtn   = document.getElementById('pauseBtn');
const stopBtn    = document.getElementById('stopBtn');
const tempoInput = document.getElementById('tempo');
const tonicSel   = document.getElementById('tonicSelect');
const modeSel    = document.getElementById('modeSelect');

/* ------------------------------------------------------------------
 * BUILD PIANO HEADER
 * ----------------------------------------------------------------*/
const octRow = piano.insertRow();
const labRow = piano.insertRow();
const keyRow = piano.insertRow();
const labelCells = [];                               // refs for updates

OCTAVES.forEach(oct => {
  const oc = octRow.insertCell();
  oc.colSpan = NAMES.length;
  oc.textContent = oct;
  oc.className = 'octave';

  NAMES.forEach(n => {
    const lab = labRow.insertCell();
    lab.className = 'note';
    labelCells.push(lab);

    const kc  = keyRow.insertCell();
    const div = document.createElement('div');
    div.className = `key ${n.includes('#') ? 'black' : 'white'}`;
    div.dataset.note = n + oct;
    kc.appendChild(div);
  });
});

/* column → note (with octave) -------------------------------------- */
const NOTES_LINEAR = OCTAVES.flatMap(o => NAMES.map(n => n + o));

/* ------------------------------------------------------------------
 * KEY / SCALE LOGIC
 * ----------------------------------------------------------------*/
const NAT_PC       = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const MAJ_INTERVAL = [0,2,4,5,7,9,11];
const MIN_INTERVAL = [0,2,3,5,7,8,10];

function pcOf(name){
  return {
    C:0,'B#':0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,
    E:4,'Fb':4,'E#':5,F:5,'F#':6,'Gb':6,G:7,
    'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11,'Cb':11
  }[name];
}

function spelledScale(tonic, mode){
  const intv = mode === 'minor' ? MIN_INTERVAL : MAJ_INTERVAL;
  const rootPc = pcOf(tonic);
  const letters = ['C','D','E','F','G','A','B'];
  const rootIdx = letters.indexOf(tonic[0]);

  const pcs = [], names = [];
  for (let i = 0; i < 7; i++) {
    const letter = letters[(rootIdx + i) % 7];
    const naturalPc = NAT_PC[letter];
    const targetPc  = (rootPc + intv[i]) % 12;

    let diff = (targetPc - naturalPc + 12) % 12;
    if (diff > 6) diff -= 12;                 // prefer flats

    let acc = '';
    if (diff ===  1) acc = '♯';
    if (diff ===  2) acc = '♯♯';
    if (diff === -1) acc = '♭';
    if (diff === -2) acc = '♭♭';

    pcs.push(targetPc);
    names.push(letter + acc);
  }
  return { pcs, names };
}

function updateKeyLabels(){
  const tonic = tonicSel.value;
  const mode  = modeSel.value;
  const { pcs, names } = spelledScale(tonic, mode);

  const pc2name = {};
  names.forEach((n, i) => pc2name[pcs[i]] = n);

  labelCells.forEach((cell, idx) => {
    const pc = pcOf(NOTES_LINEAR[idx].replace(/\d+/,''));
    cell.textContent = pc2name[pc] ?? '';     // blank if note not in scale
  });
}

/* initial labels & listeners */
updateKeyLabels();
tonicSel.addEventListener('change', updateKeyLabels);
modeSel .addEventListener('change', updateKeyLabels);

/* ------------------------------------------------------------------
 * BUILD GRID
 * ----------------------------------------------------------------*/
for (let r = 0; r < ROWS; r++) {
  const row = grid.insertRow();
  for (let c = 0; c < COLS; c++) row.insertCell();
}

/* overlays ---------------------------------------------------------- */
const cursor = Object.assign(document.createElement('div'), { id:'cursor' });
const lasso  = Object.assign(document.createElement('div'), { id:'lasso'  });
grid.append(cursor, lasso);

/* ------------------------------------------------------------------
 * AUDIO – Tone.js Sampler
 * ----------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    OCTAVES.flatMap(o => SAMPLES.map(n => [ `${n}${o}`, n.replace('#','s') + o + '.mp3' ]))
  ),
  baseUrl: 'https://tonejs.github.io/audio/salamander/'
}).toDestination();

/* ------------------------------------------------------------------
 * PLAYBACK ENGINE
 * ----------------------------------------------------------------*/
let rowPtr = 0, timer = null, held = new Set();

function step(){
  /* release */
  held.forEach(n => {
    const col = NOTES_LINEAR.indexOf(n);
    if (!grid.rows[rowPtr]?.cells[col]?.classList.contains('on')) {
      sampler.triggerRelease(n, Tone.now());
      held.delete(n);
    }
  });
  /* attack */
  const cells = grid.rows[rowPtr].cells;
  for (let c = 0; c < COLS; c++) {
    if (cells[c].classList.contains('on') && !held.has(NOTES_LINEAR[c])) {
      sampler.triggerAttack(NOTES_LINEAR[c], Tone.now());
      held.add(NOTES_LINEAR[c]);
    }
  }
  cursor.style.transform = `translateY(${rowPtr * CELL_PX}px)`;
  if (++rowPtr >= ROWS) stop();
}
function play (){ if (timer) return; timer = setInterval(step, 60000 / (+tempoInput.value || 120)); }
function pause(){ if (!timer) return; clearInterval(timer); timer = null; releaseAll(); }
function stop (){ pause(); rowPtr = 0; cursor.style.transform = 'translateY(-2px)'; }
function releaseAll(){ held.forEach(n => sampler.triggerRelease(n, Tone.now())); held.clear(); }

/* ------------------------------------------------------------------
 * GRID — CLICK / LASSO / MOVE
 * ----------------------------------------------------------------*/
const selection = new Set();  // committed orange cells
let   tempSel   = new Set();  // live during drag
let   down = false, dragging = false, sRow = 0, sCol = 0;

function clearSel(){
  selection.forEach(td => td.classList.remove('selected'));
  selection.clear();
}

/* lasso helpers */
function drawLasso(minR, minC, maxR, maxC){
  lasso.style.display = 'block';
  lasso.style.left   = minC * CELL_PX + 'px';
  lasso.style.top    = minR * CELL_PX + 'px';
  lasso.style.width  = (maxC - minC + 1) * CELL_PX + 'px';
  lasso.style.height = (maxR - minR + 1) * CELL_PX + 'px';
}
function updateTemp(minR, minC, maxR, maxC){
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

/* events */
grid.addEventListener('pointerdown', e => {
  const td = e.target.closest('td'); if (!td) return;
  down = true; dragging = false;
  sRow = td.parentNode.rowIndex; sCol = td.cellIndex;
  if (selection.size) return;             // next click only clears
});
grid.addEventListener('pointerover', e => {
  if (!down) return;
  const td = e.target.closest('td'); if (!td) return;
  const r = td.parentNode.rowIndex, c = td.cellIndex;
  if (!dragging && (r !== sRow || c !== sCol)) {
    dragging = true; lasso.style.display = 'block';
  }
  if (dragging) {
    const minR = Math.min(sRow, r), maxR = Math.max(sRow, r);
    const minC = Math.min(sCol, c), maxC = Math.max(sCol, c);
    drawLasso(minR, minC, maxR, maxC);
    updateTemp(minR, minC, maxR, maxC);
  }
});
window.addEventListener('pointerup', e => {
  if (!down) return; down = false;
  if (dragging) {                 // commit lasso
    dragging = false; lasso.style.display = 'none';
    clearSel(); tempSel.forEach(td => selection.add(td)); tempSel.clear(); return;
  }
  const td = e.target.closest('td'); if (!td) return;
  if (selection.size) { clearSel(); return; }
  td.classList.toggle('on');
});
document.addEventListener('pointerdown', e => { if (!grid.contains(e.target)) clearSel(); });
document.addEventListener('keydown',       e => { if (e.key === 'Escape') clearSel(); });

/* arrow-key move */
document.addEventListener('keydown', e => {
  if (!selection.size || e.target.tagName === 'INPUT') return;
  let dR = 0, dC = 0;
  switch (e.key) {
    case 'ArrowUp'   : dR = -1; break;
    case 'ArrowDown' : dR =  1; break;
    case 'ArrowLeft' : dC = -1; break;
    case 'ArrowRight': dC =  1; break;
    default: return;
  }
  e.preventDefault();
  for (const td of selection) {
    const r = td.parentNode.rowIndex + dR, c = td.cellIndex + dC;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;  // edge stop
  }
  const moves = [];
  selection.forEach(src => {
    const r = src.parentNode.rowIndex, c = src.cellIndex;
    moves.push([src, grid.rows[r + dR].cells[c + dC]]);
  });
  moves.forEach(([src]) => src.classList.remove('on', 'selected'));
  moves.forEach(([,dst]) => dst.classList.add('on', 'selected'));
  selection.clear(); moves.forEach(([,dst]) => selection.add(dst));
});

/* ------------------------------------------------------------------
 * MANUAL PIANO PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown', e => {
  const k = e.target.closest('.key'); if (!k) return;
  k.classList.add('held');
  sampler.triggerAttack(k.dataset.note, Tone.now());
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
playBtn .addEventListener('click', play );
pauseBtn.addEventListener('click', pause);
stopBtn .addEventListener('click', stop );
