/* ----------------------------------------------------------------------
 *  CONFIG
 * --------------------------------------------------------------------*/
const OCTAVES             = [2, 3, 4, 5];
const NOTES_IN_OCTAVE      = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLE_NOTES         = ['A','C','D#','F#'];   // actual Salamander files
const GRID_ROWS            = 200;                   // time steps
const COLS                 = NOTES_IN_OCTAVE.length * OCTAVES.length; // 48
const CELL_PX              = 26;                    // CSS --grid-s

/* ----------------------------------------------------------------------
 *  DOM
 * --------------------------------------------------------------------*/
const pianoTable = document.getElementById('piano');
const gridTable  = document.getElementById('grid');
const playBtn    = document.getElementById('playBtn');
const pauseBtn   = document.getElementById('pauseBtn');
const stopBtn    = document.getElementById('stopBtn');
const tempoInput = document.getElementById('tempo');

/* ----------------------------------------------------------------------
 *  BUILD PIANO (octave bar + labels + keys)
 * --------------------------------------------------------------------*/
const octRow  = pianoTable.insertRow();
const noteRow = pianoTable.insertRow();
const keyRow  = pianoTable.insertRow();

OCTAVES.forEach(oct=>{
  const ocCell = octRow.insertCell();
  ocCell.colSpan = NOTES_IN_OCTAVE.length;
  ocCell.textContent = oct;
  ocCell.className = 'octave';

  NOTES_IN_OCTAVE.forEach(note=>{
    // note label
    noteRow.insertCell().textContent = note.replace('#','♯');
    noteRow.lastChild.className = 'note';

    // playable key
    const kCell = keyRow.insertCell();
    const div   = document.createElement('div');
    div.className = `key ${note.includes('#') ? 'black':'white'}`;
    div.dataset.note = note + oct;
    kCell.appendChild(div);
  });
});

/* ----------------------------------------------------------------------
 *  BUILD GRID
 * --------------------------------------------------------------------*/
for(let r=0;r<GRID_ROWS;r++){
  const row = gridTable.insertRow();
  for(let c=0;c<COLS;c++){
    row.insertCell();               // empty <td>, click handled later
  }
}

/* red cursor overlay */
const cursor = document.createElement('div');
cursor.id = 'cursor';
gridTable.appendChild(cursor);

/* ----------------------------------------------------------------------
 *  AUDIO (Tone.Sampler)
 * --------------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVES.flatMap(oct=>
      SAMPLE_NOTES.map(n=>[`${n}${oct}`, n.replace('#','s')+oct+'.mp3'])
    )
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/',
}).toDestination();

/* helper: linear note list */
const NOTES_LINEAR = OCTAVES.flatMap(oct=>NOTES_IN_OCTAVE.map(n=>n+oct));

/* ----------------------------------------------------------------------
 *  SEQUENCER PLAYBACK
 * --------------------------------------------------------------------*/
let rowIdx=0, timerId=null, held=new Set();

function step(){
  /* release notes that end here */
  held.forEach(n=>{
    const col = NOTES_LINEAR.indexOf(n);
    if(!gridTable.rows[rowIdx]?.cells[col]?.classList.contains('on')){
      sampler.triggerRelease(n, Tone.now());
      held.delete(n);
    }
  });

  /* start notes in this row */
  const cells = gridTable.rows[rowIdx].cells;
  for(let c=0;c<COLS;c++){
    if(cells[c].classList.contains('on') && !held.has(NOTES_LINEAR[c])){
      sampler.triggerAttack(NOTES_LINEAR[c], Tone.now());
      held.add(NOTES_LINEAR[c]);
    }
  }

  /* move cursor */
  cursor.style.transform = `translateY(${rowIdx * CELL_PX}px)`;

  /* advance */
  rowIdx++;
  if(rowIdx >= GRID_ROWS) stop();
}

function play(){
  if(timerId) return;
  const bpm = parseFloat(tempoInput.value) || 120;
  timerId = setInterval(step, 60000 / bpm);
}
function pause(){
  if(!timerId) return;
  clearInterval(timerId); timerId=null; releaseAll();
}
function stop(){
  pause(); rowIdx=0; cursor.style.transform='translateY(-2px)';
}
function releaseAll(){
  held.forEach(n=>sampler.triggerRelease(n, Tone.now()));
  held.clear();
}

/* ----------------------------------------------------------------------
 *  GRID – single-cell toggle
 * --------------------------------------------------------------------*/
let suppressNextClick = false;
gridTable.addEventListener('click', e=>{
  if(suppressNextClick){ suppressNextClick=false; return; }
  const td = e.target.closest('td'); if(!td) return;
  td.classList.toggle('on');
});

/* ----------------------------------------------------------------------
 *  DRAG-SELECTION
 * --------------------------------------------------------------------*/
let dragging=false, startRow=0, startCol=0, dragCells=new Set(), selected=new Set();

function clearSelection(){
  selected.forEach(td=>td.classList.remove('selected'));
  selected.clear();
}
function highlightRect(r1,c1,r2,c2){
  dragCells.forEach(td=>td.classList.remove('selected'));
  dragCells.clear();
  for(let r=r1;r<=r2;r++){
    const row = gridTable.rows[r];
    for(let c=c1;c<=c2;c++){
      const td = row.cells[c];
      td.classList.add('selected');
      dragCells.add(td);
    }
  }
}

gridTable.addEventListener('pointerdown', e=>{
  const td=e.target.closest('td'); if(!td) return;
  clearSelection();
  dragging=true; suppressNextClick=false;

  startRow = td.parentNode.rowIndex;
  startCol = td.cellIndex;
  highlightRect(startRow,startCol,startRow,startCol);
});

gridTable.addEventListener('pointerover', e=>{
  if(!dragging) return;
  const td=e.target.closest('td'); if(!td) return;
  const curRow=td.parentNode.rowIndex, curCol=td.cellIndex;
  const minR=Math.min(startRow,curRow), maxR=Math.max(startRow,curRow);
  const minC=Math.min(startCol,curCol), maxC=Math.max(startCol,curCol);
  highlightRect(minR,minC,maxR,maxC);
  if(dragCells.size>1) suppressNextClick=true; // treat as drag not click
});

window.addEventListener('pointerup', ()=>{
  if(!dragging) return;
  dragging=false;

  /* commit selection: make cells ON and keep them orange */
  dragCells.forEach(td=>{
    td.classList.add('on');        // turn on if not already
    selected.add(td);              // persist highlight
  });
  dragCells.clear();
});

/* click outside grid clears orange highlight */
document.addEventListener('pointerdown', e=>{
  if(!gridTable.contains(e.target)) clearSelection();
});

/* ----------------------------------------------------------------------
 *  PIANO – manual play
 * --------------------------------------------------------------------*/
pianoTable.addEventListener('pointerdown', e=>{
  const key=e.target.closest('.key'); if(!key) return;
  key.classList.add('held');
  sampler.triggerAttack(key.dataset.note, Tone.now());
});
window.addEventListener('pointerup', ()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held');
    sampler.triggerRelease(k.dataset.note, Tone.now());
  });
});

/* ----------------------------------------------------------------------
 *  TRANSPORT BUTTONS
 * --------------------------------------------------------------------*/
playBtn .addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
stopBtn .addEventListener('click', stop);
