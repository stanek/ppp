Below is a **drop-in replacement** for **`script.js`** that fixes the “overwriting” bug when you move a stacked selection up or down.
The only change is in the **arrow-key move handler**: it now performs **removal and addition in two separate phases**, so overlapping moves don’t cancel each other out.

*No other files need to change.*

```js
/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES  = [2, 3, 4, 5];
const NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLES  = ['A','C','D#','F#'];
const ROWS     = 200;
const COLS     = NAMES.length * OCTAVES.length;
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
  oc.colSpan = NAMES.length; oc.textContent = oct; oc.className = 'octave';

  NAMES.forEach(n=>{
    labRow.insertCell().textContent = n.replace('#','♯');
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
for(let r=0;r<ROWS;r++){
  const row = grid.insertRow();
  for(let c=0;c<COLS;c++) row.insertCell();
}

/* overlays */
const cursor = Object.assign(document.createElement('div'), { id:'cursor' });
const lasso  = Object.assign(document.createElement('div'), { id:'lasso'  });
grid.append(cursor, lasso);

/* linear col ⇒ note map */
const NOTES = OCTAVES.flatMap(o=>NAMES.map(n=>n+o));

/* ------------------------------------------------------------------
 * SAMPLER
 * ----------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVES.flatMap(o=>SAMPLES.map(n=>[`${n}${o}`, n.replace('#','s')+o+'.mp3']))
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/'
}).toDestination();

/* ------------------------------------------------------------------
 * PLAYBACK
 * ----------------------------------------------------------------*/
let ptr=0, timer=null, held=new Set();

function step(){
  /* release */
  held.forEach(n=>{
    const col=NOTES.indexOf(n);
    if(!grid.rows[ptr]?.cells[col]?.classList.contains('on')){
      sampler.triggerRelease(n, Tone.now()); held.delete(n);
    }
  });

  /* attack */
  const cells = grid.rows[ptr].cells;
  for(let c=0;c<COLS;c++){
    if(cells[c].classList.contains('on') && !held.has(NOTES[c])){
      sampler.triggerAttack(NOTES[c], Tone.now()); held.add(NOTES[c]);
    }
  }

  cursor.style.transform = `translateY(${ptr*CELL_PX}px)`;
  if(++ptr>=ROWS) stop();
}
function play()  { if(timer) return; timer=setInterval(step, 60000/(+tempo.value||120)); }
function pause() { if(!timer) return; clearInterval(timer); timer=null; releaseAll(); }
function stop()  { pause(); ptr=0; cursor.style.transform='translateY(-2px)'; }
function releaseAll(){ held.forEach(n=>sampler.triggerRelease(n,Tone.now())); held.clear(); }

/* ------------------------------------------------------------------
 * CLICK / DRAG SELECTION
 * (unchanged logic from previous version)
 * ----------------------------------------------------------------*/
const selection=new Set();
let   tempSel =new Set();
let pointerDown=false, dragActive=false, sRow=0, sCol=0;

function clearSelection(){
  selection.forEach(td=>td.classList.remove('selected')); selection.clear();
}

function showLasso(minR,minC,maxR,maxC){
  lasso.style.display='block';
  lasso.style.left  =minC*CELL_PX+'px';
  lasso.style.top   =minR*CELL_PX+'px';
  lasso.style.width =(maxC-minC+1)*CELL_PX+'px';
  lasso.style.height=(maxR-minR+1)*CELL_PX+'px';
}

function updateTemp(minR,minC,maxR,maxC){
  tempSel.forEach(td=>td.classList.remove('selected')); tempSel.clear();
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

grid.addEventListener('pointerdown',e=>{
  const td=e.target.closest('td'); if(!td) return;
  pointerDown=true; dragActive=false; sRow=td.parentNode.rowIndex; sCol=td.cellIndex;
  if(selection.size) return;  // next click just clears later
});

grid.addEventListener('pointerover',e=>{
  if(!pointerDown) return;
  const td=e.target.closest('td'); if(!td) return;
  const r=td.parentNode.rowIndex, c=td.cellIndex;
  if(!dragActive && (r!==sRow || c!==sCol)){ dragActive=true; lasso.style.display='block'; }
  if(dragActive){
    const minR=Math.min(sRow,r), maxR=Math.max(sRow,r);
    const minC=Math.min(sCol,c), maxC=Math.max(sCol,c);
    showLasso(minR,minC,maxR,maxC);
    updateTemp(minR,minC,maxR,maxC);
  }
});

window.addEventListener('pointerup',e=>{
  if(!pointerDown) return; pointerDown=false;
  if(dragActive){
    dragActive=false; lasso.style.display='none';
    clearSelection(); tempSel.forEach(td=>selection.add(td)); tempSel.clear();
    return;
  }
  /* simple click */
  const td=e.target.closest('td');
  if(!td) return;
  if(selection.size){ clearSelection(); return; }
  td.classList.toggle('on');
});

document.addEventListener('pointerdown',e=>{ if(!grid.contains(e.target)) clearSelection(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') clearSelection(); });

/* ------------------------------------------------------------------
 * MOVE SELECTION (FIXED)
 * ----------------------------------------------------------------*/
document.addEventListener('keydown',e=>{
  if(!selection.size) return;
  if(e.target.tagName==='INPUT') return;

  let dR=0,dC=0;
  switch(e.key){
    case 'ArrowUp':    dR=-1; break;
    case 'ArrowDown':  dR= 1; break;
    case 'ArrowLeft':  dC=-1; break;
    case 'ArrowRight': dC= 1; break;
    default: return;
  }
  e.preventDefault();

  /* edge guard */
  for(const td of selection){
    const r=td.parentNode.rowIndex+dR, c=td.cellIndex+dC;
    if(r<0||r>=ROWS||c<0||c>=COLS) return;
  }

  /* -------- TWO-PHASE MOVE (prevents overwrite) -------- */
  const moves=[];                    // [srcTd, destTd]
  selection.forEach(src=>{
    const r=src.parentNode.rowIndex, c=src.cellIndex;
    moves.push([src, grid.rows[r+dR].cells[c+dC]]);
  });

  /* 1) remove classes from all sources */
  moves.forEach(([src])=> src.classList.remove('on','selected'));

  /* 2) add classes to all destinations */
  moves.forEach(([ ,dest])=> dest.classList.add('on','selected'));

  /* 3) rebuild selection set */
  selection.clear();
  moves.forEach(([ ,dest])=> selection.add(dest));
});

/* ------------------------------------------------------------------
 * MANUAL PIANO PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown',e=>{
  const k=e.target.closest('.key'); if(!k) return;
  k.classList.add('held'); sampler.triggerAttack(k.dataset.note, Tone.now());
});
window.addEventListener('pointerup',()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
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
```

### What changed

* **Arrow-key move handler** now records every source/destination pair in `moves`.
  It **removes** the `on`/`selected` classes from **all** sources first, **then** adds them to every destination, so overlapping moves (like rows 3 & 4 → 4 & 5) no longer cancel each other out.

Everything else—lasso, click-toggle, playback, etc.—remains unchanged. Try selecting rows 3 and 4, press **↓**, and you’ll now see rows 4 and 5 correctly lit. 🎹
