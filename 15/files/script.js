/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES  = [2,3,4,5];
const NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLES  = ['A','C','D#','F#'];          // real mp3s
const ROWS     = 200;
const COLS     = NAMES.length * OCTAVES.length; // 48
const CELL_PX  = 26;

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

OCTAVES.forEach(oct=>{
  const oc = octRow.insertCell();
  oc.colSpan = NAMES.length; oc.textContent = oct; oc.className='octave';

  NAMES.forEach(n=>{
    labRow.insertCell().textContent = n.replace('#','♯');
    labRow.lastChild.className='note';

    const kc = keyRow.insertCell();
    const div=document.createElement('div');
    div.className=`key ${n.includes('#')?'black':'white'}`;
    div.dataset.note=n+oct; kc.appendChild(div);
  });
});

/* ------------------------------------------------------------------
 * BUILD GRID
 * ----------------------------------------------------------------*/
for(let r=0;r<ROWS;r++){
  const row=grid.insertRow();
  for(let c=0;c<COLS;c++) row.insertCell();
}

/* overlays */
const cursor=document.createElement('div'); cursor.id='cursor'; grid.appendChild(cursor);
const lasso =document.createElement('div'); lasso.id='lasso';  grid.appendChild(lasso);

/* linear note map */
const NOTES = OCTAVES.flatMap(o=>NAMES.map(n=>n+o));

/* ------------------------------------------------------------------
 * SAMPLER
 * ----------------------------------------------------------------*/
const sampler=new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVES.flatMap(o=>SAMPLES.map(n=>[`${n}${o}`,n.replace('#','s')+o+'.mp3']))
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/'
}).toDestination();

/* ------------------------------------------------------------------
 * PLAYBACK
 * ----------------------------------------------------------------*/
let ptr=0,timer=null,held=new Set();
function step(){
  /* release */
  held.forEach(n=>{
    const col=NOTES.indexOf(n);
    if(!grid.rows[ptr]?.cells[col]?.classList.contains('on')){
      sampler.triggerRelease(n,Tone.now()); held.delete(n);
    }
  });
  /* attack */
  const cells=grid.rows[ptr].cells;
  for(let c=0;c<COLS;c++){
    if(cells[c].classList.contains('on') && !held.has(NOTES[c])){
      sampler.triggerAttack(NOTES[c],Tone.now()); held.add(NOTES[c]);
    }
  }
  cursor.style.transform=`translateY(${ptr*CELL_PX}px)`;
  if(++ptr>=ROWS) stop();
}
function play(){ if(timer) return; timer=setInterval(step,60000/(+tempo.value||120)); }
function pause(){ if(!timer) return; clearInterval(timer); timer=null; releaseAll(); }
function stop(){ pause(); ptr=0; cursor.style.transform='translateY(-2px)'; }
function releaseAll(){ held.forEach(n=>sampler.triggerRelease(n,Tone.now())); held.clear(); }

/* ------------------------------------------------------------------
 * SIMPLE TOGGLE
 * ----------------------------------------------------------------*/
function clearSelection(){
  sel.forEach(td=>td.classList.remove('selected')); sel.clear();
}
grid.addEventListener('click',e=>{
  const td=e.target.closest('td'); if(!td) return;
  if(sel.size){ clearSelection(); return; }      // first click just deselects
  td.classList.toggle('on');
});

/* ------------------------------------------------------------------
 * LASSO SELECTION
 * ----------------------------------------------------------------*/
let drag=false,sr=0,sc=0;          // drag start row/col
const sel=new Set();               // committed selection
let temp=new Set();                // live during drag

function updateLasso(minR,minC,maxR,maxC){
  lasso.style.display='block';
  lasso.style.left  =minC*CELL_PX+'px';
  lasso.style.top   =minR*CELL_PX+'px';
  lasso.style.width =(maxC-minC+1)*CELL_PX+'px';
  lasso.style.height=(maxR-minR+1)*CELL_PX+'px';
}

function updateTemp(minR,minC,maxR,maxC){
  temp.forEach(td=>td.classList.remove('selected')); temp.clear();
  for(let r=minR;r<=maxR;r++){
    const row=grid.rows[r];
    for(let c=minC;c<=maxC;c++){
      const td=row.cells[c];
      if(td.classList.contains('on')){
        td.classList.add('selected'); temp.add(td);
      }
    }
  }
}

grid.addEventListener('pointerdown',e=>{
  const td=e.target.closest('td'); if(!td) return;
  drag=true; sr=td.parentNode.rowIndex; sc=td.cellIndex;
  clearSelection(); updateLasso(sr,sc,sr,sc); updateTemp(sr,sc,sr,sc);
});
grid.addEventListener('pointerover',e=>{
  if(!drag) return;
  const td=e.target.closest('td'); if(!td) return;
  const r=td.parentNode.rowIndex, c=td.cellIndex;
  const minR=Math.min(sr,r), maxR=Math.max(sr,r);
  const minC=Math.min(sc,c), maxC=Math.max(sc,c);
  updateLasso(minR,minC,maxR,maxC);
  updateTemp(minR,minC,maxR,maxC);
});
window.addEventListener('pointerup',()=>{
  if(!drag) return; drag=false; lasso.style.display='none';
  temp.forEach(td=>sel.add(td)); temp.clear();
});

/* click outside grid clears selection */
document.addEventListener('pointerdown',e=>{
  if(!grid.contains(e.target)) clearSelection();
});
/* Esc clears selection */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') clearSelection();
});

/* ------------------------------------------------------------------
 * MOVE SELECTION WITH ARROWS
 * ----------------------------------------------------------------*/
document.addEventListener('keydown',e=>{
  if(!sel.size) return;
  if(e.target.tagName==='INPUT') return;

  let dR=0,dC=0;
  switch(e.key){
    case 'ArrowUp'  : dR=-1; break;
    case 'ArrowDown': dR= 1; break;
    case 'ArrowLeft': dC=-1; break;
    case 'ArrowRight':dC= 1; break;
    default:return;
  }
  e.preventDefault();

  /* edge check */
  for(const td of sel){
    const r=td.parentNode.rowIndex+dR, c=td.cellIndex+dC;
    if(r<0||r>=ROWS||c<0||c>=COLS) return;
  }

  const next=new Set();
  sel.forEach(td=>{
    const r=td.parentNode.rowIndex, c=td.cellIndex;
    const dest=grid.rows[r+dR].cells[c+dC];
    td.classList.remove('on','selected');
    dest.classList.add('on','selected'); next.add(dest);
  });
  sel.clear(); next.forEach(td=>sel.add(td));
});

/* ------------------------------------------------------------------
 * PIANO MANUAL PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown',e=>{
  const k=e.target.closest('.key'); if(!k) return;
  k.classList.add('held'); sampler.triggerAttack(k.dataset.note,Tone.now());
});
window.addEventListener('pointerup',()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held');
    sampler.triggerRelease(k.dataset.note,Tone.now());
  });
});

/* ------------------------------------------------------------------
 * TRANSPORT BUTTONS
 * ----------------------------------------------------------------*/
playB .addEventListener('click',play );
pauseB.addEventListener('click',pause);
stopB .addEventListener('click',stop );
