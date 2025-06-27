/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES        = [2,3,4,5];
const NOTE_NAMES     = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLE_NOTES   = ['A','C','D#','F#'];   // real mp3s
const ROWS           = 200;                   // timeline length
const COLS           = NOTE_NAMES.length * OCTAVES.length;  // 48
const CELL_PX        = 26;                    // grid cell height (CSS)

/* ------------------------------------------------------------------
 * DOM HANDLES
 * ----------------------------------------------------------------*/
const piano = document.getElementById('piano');
const grid  = document.getElementById('grid');
const playB = document.getElementById('playBtn');
const pauseB= document.getElementById('pauseBtn');
const stopB = document.getElementById('stopBtn');
const tempo = document.getElementById('tempo');

/* ------------------------------------------------------------------
 * PIANO HEADER
 * ----------------------------------------------------------------*/
const rowOct = piano.insertRow();
const rowLab = piano.insertRow();
const rowKey = piano.insertRow();

OCTAVES.forEach(oct=>{
  const oc       = rowOct.insertCell();
  oc.colSpan     = NOTE_NAMES.length;
  oc.textContent = oct;
  oc.className   = 'octave';

  NOTE_NAMES.forEach(n=>{
    rowLab.insertCell().textContent = n.replace('#','♯');
    rowLab.lastChild.className = 'note';

    const kCell = rowKey.insertCell();
    const div   = document.createElement('div');
    div.className = `key ${n.includes('#')?'black':'white'}`;
    div.dataset.note = n+oct;
    kCell.appendChild(div);
  });
});

/* ------------------------------------------------------------------
 * SEQUENCER GRID
 * ----------------------------------------------------------------*/
for(let r=0;r<ROWS;r++){
  const row = grid.insertRow();
  for(let c=0;c<COLS;c++) row.insertCell();     // empty td
}

/* playback cursor */
const cursor = document.createElement('div');
cursor.id='cursor'; grid.appendChild(cursor);

/* linear note map  col→note  */
const NOTES_LINEAR = OCTAVES.flatMap(o=>NOTE_NAMES.map(n=>n+o));

/* ------------------------------------------------------------------
 * SAMPLER  (Salamander Grand)
 * ----------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVES.flatMap(o=>SAMPLE_NOTES.map(n=>[`${n}${o}`, n.replace('#','s')+o+'.mp3']))
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/'
}).toDestination();

/* ------------------------------------------------------------------
 * PLAYBACK ENGINE
 * ----------------------------------------------------------------*/
let rowPtr=0, timer=null, held=new Set();

function step(){
  /* release that end here */
  held.forEach(n=>{
    const col = NOTES_LINEAR.indexOf(n);
    if(!grid.rows[rowPtr]?.cells[col]?.classList.contains('on')){
      sampler.triggerRelease(n, Tone.now()); held.delete(n);
    }
  });

  /* trigger new */
  const cells = grid.rows[rowPtr].cells;
  for(let c=0;c<COLS;c++){
    if(cells[c].classList.contains('on') && !held.has(NOTES_LINEAR[c])){
      sampler.triggerAttack(NOTES_LINEAR[c], Tone.now()); held.add(NOTES_LINEAR[c]);
    }
  }

  /* move cursor */
  cursor.style.transform = `translateY(${rowPtr*CELL_PX}px)`;

  /* advance */
  rowPtr++; if(rowPtr>=ROWS) stop();
}
function play(){
  if(timer) return;
  const ms = 60000/(parseFloat(tempo.value)||120);
  timer = setInterval(step, ms);
}
function pause(){ if(timer){ clearInterval(timer); timer=null; releaseAll(); }}
function stop (){ pause(); rowPtr=0; cursor.style.transform='translateY(-2px)'; }
function releaseAll(){ held.forEach(n=>sampler.triggerRelease(n,Tone.now())); held.clear(); }

/* ------------------------------------------------------------------
 * GRID  – single-cell toggle
 * ----------------------------------------------------------------*/
grid.addEventListener('click', e=>{
  const td=e.target.closest('td'); if(!td) return;
  td.classList.toggle('on');
  /* if note turned off, also unselect it */
  if(!td.classList.contains('on')){ td.classList.remove('selected'); selection.delete(td); }
});

/* ------------------------------------------------------------------
 * LASSO SELECTION (orange)
 * ----------------------------------------------------------------*/
let dragging=false, startR=0, startC=0;
const selection=new Set();      // committed
let tempSel = new Set();        // live during drag

function clearSelection(){
  selection.forEach(td=>td.classList.remove('selected'));
  selection.clear();
}
function updateTempSel(minR,minC,maxR,maxC){
  /* remove previous */
  tempSel.forEach(td=>td.classList.remove('selected')); tempSel.clear();
  /* add new where cells are ON */
  for(let r=minR;r<=maxR;r++){
    const row=grid.rows[r];
    for(let c=minC;c<=maxC;c++){
      const td=row.cells[c];
      if(td.classList.contains('on')){
        td.classList.add('selected'); tempSel.add(td);
      }
    }
  }
}

grid.addEventListener('pointerdown', e=>{
  const td=e.target.closest('td'); if(!td) return;
  dragging=true; startR=td.parentNode.rowIndex; startC=td.cellIndex;
  clearSelection(); updateTempSel(startR,startC,startR,startC);
});
grid.addEventListener('pointerover', e=>{
  if(!dragging) return;
  const td=e.target.closest('td'); if(!td) return;
  const r=td.parentNode.rowIndex, c=td.cellIndex;
  updateTempSel(Math.min(startR,r),Math.min(startC,c),
                Math.max(startR,r),Math.max(startC,c));
});
window.addEventListener('pointerup', ()=>{
  if(!dragging) return; dragging=false;
  /* commit */
  tempSel.forEach(td=>selection.add(td));
  tempSel.clear();
});
/* Esc clears selection */
document.addEventListener('keydown', e=>{
  if(e.key==='Escape') clearSelection();
});
/* click outside grid clears highlight */
document.addEventListener('pointerdown', e=>{
  if(!grid.contains(e.target)) clearSelection();
});

/* ------------------------------------------------------------------
 * MOVE SELECTION WITH ARROW KEYS
 * ----------------------------------------------------------------*/
document.addEventListener('keydown', e=>{
  if(selection.size===0) return;             // nothing to move
  if(e.target.tagName==='INPUT') return;     // ignore tempo field

  let dR=0,dC=0;
  switch(e.key){
    case 'ArrowUp'   : dR=-1; break;
    case 'ArrowDown' : dR= 1; break;
    case 'ArrowLeft' : dC=-1; break;
    case 'ArrowRight': dC= 1; break;
    default: return;
  }
  e.preventDefault();

  /* boundary check */
  for(const td of selection){
    const r=td.parentNode.rowIndex+dR, c=td.cellIndex+dC;
    if(r<0||r>=ROWS||c<0||c>=COLS) return;   // abort move
  }

  /* build new positions */
  const newCells=new Set();
  selection.forEach(td=>{
    const r=td.parentNode.rowIndex, c=td.cellIndex;
    const dest = grid.rows[r+dR].cells[c+dC];
    /* clear old */
    td.classList.remove('on','selected');
    /* set new */
    dest.classList.add('on','selected');
    newCells.add(dest);
  });
  selection.clear(); newCells.forEach(td=>selection.add(td));
});

/* ------------------------------------------------------------------
 * MANUAL KEY PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown', e=>{
  const k=e.target.closest('.key'); if(!k) return;
  k.classList.add('held'); sampler.triggerAttack(k.dataset.note, Tone.now());
});
window.addEventListener('pointerup', ()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held');
    sampler.triggerRelease(k.dataset.note, Tone.now());
  });
});

/* ------------------------------------------------------------------
 * TRANSPORT BUTTONS
 * ----------------------------------------------------------------*/
playB .addEventListener('click', play);
pauseB.addEventListener('click', pause);
stopB .addEventListener('click', stop);
