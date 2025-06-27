Below are fully-updated files.

* **styles.css** ─ same as the last version (with tokenised grid colours).
* **script.js** ─ adds a configurable **`PREVIEW_DUR`** (default 0.25 s) and plays a short note when you turn a grid cell **on**, whether by click or by lasso selection.

---

## styles.css  (unchanged except for the token section you already have)

```css
:root{
  /* piano colours */
  --white-key:#fff;
  --black-key:#111;

  /* grid colours (change any time) */
  --grid-bg : #333;   /* default cell              */
  --grid-out: #444;   /* cell outside selected key */
  --grid-on : #228b22;/* green “on” cell           */

  /* selection highlight */
  --sel:#ff8c00;

  /* sizes */
  --key-w :25px;
  --key-h :150px;
  --cell  :calc(var(--key-w) + 1px);
}

/* basic layout … (all remaining rules identical to previous version) */

.seq td{ width:var(--cell); height:var(--cell);
         background:var(--grid-bg); border:1px solid #555; cursor:pointer; }
.seq td.outkey  { background:var(--grid-out); }
.seq td.on      { background:var(--grid-on); }
.seq td.selected{ background:var(--sel) !important; }

/* piano sticky, cursor, lasso, etc.—unchanged */
```

---

## script.js  (full replacement)

```js
/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES      = [2, 3, 4, 5];
const NOTE_NAMES   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLE_ROOTS = ['A','C','D#','F#'];            // mp3 files present
const ROWS = 200;
const COLS = OCTAVES.length * NOTE_NAMES.length;
const CELL_PX     = 26;

/* play a short preview when placing a note */
const PREVIEW_DUR = 0.25;      // seconds – edit to taste

const STORE_KEY   = 'pianoSequencerState';

/* ------------------------------------------------------------------
 * DOM
 * ----------------------------------------------------------------*/
const piano  = document.getElementById('piano');
const grid   = document.getElementById('grid');
const playB  = document.getElementById('playBtn');
const pauseB = document.getElementById('pauseBtn');
const stopB  = document.getElementById('stopBtn');
const tempo  = document.getElementById('tempo');
const tonicSel = document.getElementById('tonicSelect');
const modeSel  = document.getElementById('modeSelect');

/* ------------------------------------------------------------------
 * BUILD PIANO HEADER
 * ----------------------------------------------------------------*/
const rowOct = piano.insertRow();
const rowLab = piano.insertRow();
const rowKey = piano.insertRow();
const labelCells=[];

OCTAVES.forEach(oct=>{
  const oc=rowOct.insertCell();
  oc.colSpan=NOTE_NAMES.length; oc.textContent=oct; oc.className='octave';

  NOTE_NAMES.forEach(n=>{
    const lab=rowLab.insertCell();
    lab.className='note'; labelCells.push(lab);

    const kc=rowKey.insertCell();
    const div=document.createElement('div');
    div.className=`key ${n.includes('#')?'black':'white'}`;
    div.dataset.note=n+oct; kc.appendChild(div);
  });
});

/* column → note (with octave) */
const NOTES_LINEAR = OCTAVES.flatMap(o=>NOTE_NAMES.map(n=>n+o));
const COL_PC       = NOTES_LINEAR.map(n=>{
  const b=n.replace(/\d+/,'');
  return {C:0,'B#':0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,
          E:4,'Fb':4,'E#':5,F:5,'F#':6,'Gb':6,G:7,
          'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11,'Cb':11}[b];
});

/* ------------------------------------------------------------------
 * SCALE LOGIC
 * ----------------------------------------------------------------*/
const NAT_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const MAJ_IV=[0,2,4,5,7,9,11], MIN_IV=[0,2,3,5,7,8,10];
function spelledScale(tonic,mode){
  const pcOf=t=>({C:0,'B#':0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,'Fb':4,'E#':5,
                  F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11,'Cb':11}[t]);
  const iv=mode==='minor'?MIN_IV:MAJ_IV, rootPc=pcOf(tonic);
  const letters=['C','D','E','F','G','A','B'], li=letters.indexOf(tonic[0]);
  const pcs=[],names=[];
  for(let i=0;i<7;i++){
    const L=letters[(li+i)%7], natural=NAT_PC[L], tgt=(rootPc+iv[i])%12;
    let diff=(tgt-natural+12)%12; if(diff>6) diff-=12;
    let acc=''; if(diff===1)acc='♯'; if(diff===2)acc='♯♯';
    if(diff===-1)acc='♭'; if(diff===-2)acc='♭♭';
    pcs.push(tgt); names.push(L+acc);
  }
  return{pcs,names};
}

/* ------------------------------------------------------------------
 * PIANO LABELS + GRID SHADING
 * ----------------------------------------------------------------*/
function updateKeyLabels(){
  const {pcs,names}=spelledScale(tonicSel.value,modeSel.value);
  const inScale=new Set(pcs);
  const pc2name={}; names.forEach((n,i)=>pc2name[pcs[i]]=n);

  labelCells.forEach((cell,i)=>cell.textContent=pc2name[COL_PC[i]]??'');

  for(let r=0;r<ROWS;r++){
    const cells=grid.rows[r].cells;
    for(let c=0;c<COLS;c++){
      if(inScale.has(COL_PC[c])) cells[c].classList.remove('outkey');
      else                       cells[c].classList.add   ('outkey');
    }
  }
  saveState();
}
tonicSel.addEventListener('change',updateKeyLabels);
modeSel .addEventListener('change',updateKeyLabels);

/* ------------------------------------------------------------------
 * BUILD GRID
 * ----------------------------------------------------------------*/
for(let r=0;r<ROWS;r++){
  const row=grid.insertRow();
  for(let c=0;c<COLS;c++) row.insertCell();
}

/* overlays */
const cursor=document.createElement('div');cursor.id='cursor';
const lasso =document.createElement('div');lasso.id='lasso';
grid.append(cursor,lasso);

/* ------------------------------------------------------------------
 * AUDIO
 * ----------------------------------------------------------------*/
const sampler=new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVES.flatMap(o=>SAMPLE_ROOTS.map(n=>[`${n}${o}`,n.replace('#','s')+o+'.mp3']))
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/'
}).toDestination();

function preview(col){
  sampler.triggerAttackRelease(NOTES_LINEAR[col], PREVIEW_DUR, Tone.now());
}

/* ------------------------------------------------------------------
 * SAVE / LOAD STATE
 * ----------------------------------------------------------------*/
function getOn(){const a=[];for(let r=0;r<ROWS;r++){const cells=grid.rows[r].cells;
  for(let c=0;c<COLS;c++) if(cells[c].classList.contains('on')) a.push(r*COLS+c);}return a;}
function setOn(arr){arr.forEach(i=>{if(i>=ROWS*COLS)return;const r=Math.floor(i/COLS),c=i%COLS;
  grid.rows[r].cells[c].classList.add('on');});}
function saveState(){
  localStorage.setItem(STORE_KEY,JSON.stringify({
    key:tonicSel.value, mode:modeSel.value, tempo:tempo.value, on:getOn()
  }));
}
(function load(){
  try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(!s)return; if(s.key)tonicSel.value=s.key; if(s.mode)modeSel.value=s.mode;
    if(s.tempo)tempo.value=s.tempo; if(Array.isArray(s.on)) setOn(s.on);}catch{}
})();
updateKeyLabels();

/* persist tempo tweaks */
tempo.addEventListener('change',saveState);
tempo.addEventListener('input', saveState);

/* ------------------------------------------------------------------
 * PLAYBACK
 * ----------------------------------------------------------------*/
let rowPtr=0,timer=null,held=new Set();
function step(){
  held.forEach(n=>{
    const col=NOTES_LINEAR.indexOf(n);
    if(!grid.rows[rowPtr]?.cells[col]?.classList.contains('on')){
      sampler.triggerRelease(n,Tone.now()); held.delete(n);
    }
  });
  const cells=grid.rows[rowPtr].cells;
  for(let c=0;c<COLS;c++){
    if(cells[c].classList.contains('on')&&!held.has(NOTES_LINEAR[c])){
      sampler.triggerAttack(NOTES_LINEAR[c],Tone.now()); held.add(NOTES_LINEAR[c]);
    }
  }
  cursor.style.transform=`translateY(${rowPtr*CELL_PX}px)`;
  if(++rowPtr>=ROWS) stop();
}
function play (){ if(timer)return; timer=setInterval(step,60000/(+tempo.value||120)); }
function pause(){ if(!timer)return; clearInterval(timer); timer=null; releaseAll(); }
function stop (){ pause(); rowPtr=0; cursor.style.transform='translateY(-2px)'; }
function releaseAll(){ held.forEach(n=>sampler.triggerRelease(n,Tone.now())); held.clear(); }

/* ------------------------------------------------------------------
 * GRID INTERACTION
 * ----------------------------------------------------------------*/
const sel=new Set(); let tmp=new Set();
let down=false,drag=false,sRow=0,sCol=0;

function clearSel(){ sel.forEach(td=>td.classList.remove('selected')); sel.clear(); }

function draw(minR,minC,maxR,maxC){
  lasso.style.display='block';
  lasso.style.left=minC*CELL_PX+'px'; lasso.style.top=minR*CELL_PX+'px';
  lasso.style.width=(maxC-minC+1)*CELL_PX+'px';
  lasso.style.height=(maxR-minR+1)*CELL_PX+'px';
}
function updateTmp(minR,minC,maxR,maxC){
  tmp.forEach(td=>td.classList.remove('selected')); tmp.clear();
  for(let r=minR;r<=maxR;r++){
    const cells=grid.rows[r].cells;
    for(let c=minC;c<=maxC;c++){
      const td=cells[c];
      if(td.classList.contains('on')){ td.classList.add('selected'); tmp.add(td);}
    }
  }
}

grid.addEventListener('pointerdown',e=>{
  const td=e.target.closest('td'); if(!td)return;
  down=true; drag=false; sRow=td.parentNode.rowIndex; sCol=td.cellIndex;
  if(sel.size) return;
});
grid.addEventListener('pointerover',e=>{
  if(!down)return;
  const td=e.target.closest('td'); if(!td)return;
  const r=td.parentNode.rowIndex,c=td.cellIndex;
  if(!drag&&(r!==sRow||c!==sCol)){drag=true; lasso.style.display='block';}
  if(drag){
    const minR=Math.min(sRow,r),maxR=Math.max(sRow,r);
    const minC=Math.min(sCol,c),maxC=Math.max(sCol,c);
    draw(minR,minC,maxR,maxC); updateTmp(minR,minC,maxR,maxC);
  }
});
window.addEventListener('pointerup',e=>{
  if(!down)return; down=false;
  if(drag){ drag=false; lasso.style.display='none';
    clearSel(); tmp.forEach(td=>sel.add(td)); tmp.forEach(td=>preview(td.cellIndex));
    tmp.clear(); saveState(); return;
  }
  const td=e.target.closest('td'); if(!td)return;
  if(sel.size){ clearSel(); return; }
  td.classList.toggle('on');
  if(td.classList.contains('on')) preview(td.cellIndex);
  saveState();
});

/* clear selection outside click / Esc */
document.addEventListener('pointerdown',e=>{ if(!grid.contains(e.target)) clearSel(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') clearSel(); });

/* arrow-key move remains unchanged, still saves state */
document.addEventListener('keydown',e=>{
  if(!sel.size||e.target.tagName==='INPUT')return;
  let dR=0,dC=0;
  switch(e.key){
    case'ArrowUp':dR=-1;break;case'ArrowDown':dR=1;break;
    case'ArrowLeft':dC=-1;break;case'ArrowRight':dC=1;break;
    default:return;
  }
  e.preventDefault();
  for(const td of sel){
    const r=td.parentNode.rowIndex+dR,c=td.cellIndex+dC;
    if(r<0||r>=ROWS||c<0||c>=COLS)return;
  }
  const moves=[];
  sel.forEach(src=>{
    const r=src.parentNode.rowIndex,c=src.cellIndex;
    moves.push([src,grid.rows[r+dR].cells[c+dC]]);
  });
  moves.forEach(([s])=>s.classList.remove('on','selected'));
  moves.forEach(([,d])=>d.classList.add('on','selected'));
  sel.clear(); moves.forEach(([,d])=>sel.add(d));
  saveState();
});

/* ------------------------------------------------------------------
 * MANUAL PIANO PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown',e=>{
  const k=e.target.closest('.key'); if(!k)return;
  k.classList.add('held'); sampler.triggerAttack(k.dataset.note,Tone.now());
});
window.addEventListener('pointerup',()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held'); sampler.triggerRelease(k.dataset.note,Tone.now());
  });
});

/* ------------------------------------------------------------------
 * TRANSPORT BUTTONS
 * ----------------------------------------------------------------*/
playB.addEventListener('click',play );
pauseB.addEventListener('click',pause);
stopB.addEventListener('click',stop );
```

### Quick notes

* **`PREVIEW_DUR` token** – adjust this number once to lengthen or shorten preview sounds.
* **`preview(col)`** plays `NOTES_LINEAR[col]` for that duration.
* Preview is triggered when:

  * you toggle a single cell **on**;
  * you commit a lasso selection (each new “on” cell previews).
* Saved state persists key, mode, tempo, and grid as before.

Replace your previous `script.js` with the file above and keep your existing `styles.css`. Enjoy instant auditory feedback while sketching patterns! 🎹
