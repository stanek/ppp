/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES  = [2, 3, 4, 5];
const NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLES  = ['A','C','D#','F#'];              // real mp3s
const ROWS     = 200;
const COLS     = OCTAVES.length * NAMES.length;
const CELL_PX  = 26;
const STORE_KEY = 'pianoSequencerState';

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
const rowOct = piano.insertRow();
const rowLab = piano.insertRow();
const rowKey = piano.insertRow();
const labelCells=[];                               // refs for updates

OCTAVES.forEach(oct=>{
  const oc=rowOct.insertCell();
  oc.colSpan=NAMES.length; oc.textContent=oct; oc.className='octave';

  NAMES.forEach(n=>{
    const lab=rowLab.insertCell();
    lab.className='note'; labelCells.push(lab);

    const kc=rowKey.insertCell();
    const div=document.createElement('div');
    div.className=`key ${n.includes('#')?'black':'white'}`;
    div.dataset.note=n+oct; kc.appendChild(div);
  });
});

/* column index → note name with octave */
const NOTES_LINEAR = OCTAVES.flatMap(o=>NAMES.map(n=>n+o));

/* ------------------------------------------------------------------
 * SCALE LABEL LOGIC (unchanged)
 * ----------------------------------------------------------------*/
const NAT_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const MAJ_IV=[0,2,4,5,7,9,11], MIN_IV=[0,2,3,5,7,8,10];
function pcOf(name){return {
  C:0,'B#':0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,
  E:4,'Fb':4,'E#':5,F:5,'F#':6,'Gb':6,G:7,
  'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11,'Cb':11
}[name];}
function spelledScale(tonic,mode){
  const iv=mode==='minor'?MIN_IV:MAJ_IV, rootPc=pcOf(tonic);
  const letters=['C','D','E','F','G','A','B'];
  const li=letters.indexOf(tonic[0]);
  const pcs=[],names=[];
  for(let i=0;i<7;i++){
    const L=letters[(li+i)%7], natural= NAT_PC[L];
    const tgt=(rootPc+iv[i])%12;
    let diff=(tgt-natural+12)%12; if(diff>6) diff-=12;
    let acc=''; if(diff===1)acc='♯'; if(diff===2)acc='♯♯';
    if(diff===-1)acc='♭'; if(diff===-2)acc='♭♭';
    pcs.push(tgt); names.push(L+acc);
  }
  return{pcs,names};
}
function updateKeyLabels(){
  const {pcs,names}=spelledScale(tonicSel.value,modeSel.value);
  const m={}; names.forEach((n,i)=>m[pcs[i]]=n);
  labelCells.forEach((cell,i)=>{
    const pc=pcOf(NOTES_LINEAR[i].replace(/\d+/,''));
    cell.textContent=m[pc]??'';
  });
  saveState();
}
tonicSel.addEventListener('change',updateKeyLabels);
modeSel .addEventListener('change',updateKeyLabels);

/* ------------------------------------------------------------------
 * GRID CONSTRUCTION
 * ----------------------------------------------------------------*/
for(let r=0;r<ROWS;r++){
  const row=grid.insertRow();
  for(let c=0;c<COLS;c++) row.insertCell();
}

/* overlays ---------------------------------------------------------- */
const cursor=document.createElement('div');cursor.id='cursor';
const lasso =document.createElement('div');lasso.id='lasso';
grid.append(cursor,lasso);

/* ------------------------------------------------------------------
 * AUDIO – Tone.js Sampler
 * ----------------------------------------------------------------*/
const sampler=new Tone.Sampler({
  urls:Object.fromEntries(
    OCTAVES.flatMap(o=>SAMPLES.map(n=>[`${n}${o}`,n.replace('#','s')+o+'.mp3']))
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/'
}).toDestination();

/* ------------------------------------------------------------------
 * STATE SAVE / RESTORE
 * ----------------------------------------------------------------*/
function getOnCells(){
  const arr=[];
  for(let r=0;r<ROWS;r++){
    const cells=grid.rows[r].cells;
    for(let c=0;c<COLS;c++) if(cells[c].classList.contains('on'))
      arr.push(r*COLS+c);
  }
  return arr;
}
function applyOnCells(indices){
  indices.forEach(i=>{
    if(i>=ROWS*COLS) return;
    const r=Math.floor(i/COLS), c=i%COLS;
    grid.rows[r].cells[c].classList.add('on');
  });
}
function saveState(){
  const obj={
    key:tonicSel.value,
    mode:modeSel.value,
    tempo:tempoInput.value,
    on:getOnCells()
  };
  localStorage.setItem(STORE_KEY,JSON.stringify(obj));
}
function loadState(){
  const raw=localStorage.getItem(STORE_KEY);
  if(!raw) return;
  try{
    const obj=JSON.parse(raw);
    if(obj.key)  tonicSel.value=obj.key;
    if(obj.mode) modeSel.value=obj.mode;
    if(obj.tempo)tempoInput.value=obj.tempo;
    updateKeyLabels();
    if(Array.isArray(obj.on)) applyOnCells(obj.on);
  }catch{}
}
loadState();

/* ------------------------------------------------------------------
 * PLAYBACK ENGINE
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
function play(){ if(timer) return; timer=setInterval(step,60000/(+tempoInput.value||120)); }
function pause(){ if(!timer)return; clearInterval(timer); timer=null; releaseAll(); }
function stop(){ pause(); rowPtr=0; cursor.style.transform='translateY(-2px)'; }
function releaseAll(){ held.forEach(n=>sampler.triggerRelease(n,Tone.now())); held.clear(); }

/* ------------------------------------------------------------------
 * GRID CLICK / LASSO / MOVE
 * ----------------------------------------------------------------*/
const sel=new Set(); let tmp=new Set();
let down=false,drag=false,sRow=0,sCol=0;
function clearSel(){ sel.forEach(td=>td.classList.remove('selected')); sel.clear(); }
function drawLasso(minR,minC,maxR,maxC){
  lasso.style.display='block';
  lasso.style.left=minC*CELL_PX+'px';
  lasso.style.top=minR*CELL_PX+'px';
  lasso.style.width=(maxC-minC+1)*CELL_PX+'px';
  lasso.style.height=(maxR-minR+1)*CELL_PX+'px';
}
function updateTmp(minR,minC,maxR,maxC){
  tmp.forEach(td=>td.classList.remove('selected')); tmp.clear();
  for(let r=minR;r<=maxR;r++){
    const row=grid.rows[r];
    for(let c=minC;c<=maxC;c++){
      const td=row.cells[c];
      if(td.classList.contains('on')){ td.classList.add('selected'); tmp.add(td);}
    }
  }
}
grid.addEventListener('pointerdown',e=>{
  const td=e.target.closest('td'); if(!td) return;
  down=true; drag=false; sRow=td.parentNode.rowIndex; sCol=td.cellIndex;
  if(sel.size) return;
});
grid.addEventListener('pointerover',e=>{
  if(!down) return;
  const td=e.target.closest('td'); if(!td) return;
  const r=td.parentNode.rowIndex,c=td.cellIndex;
  if(!drag&&(r!==sRow||c!==sCol)){ drag=true; lasso.style.display='block'; }
  if(drag){
    const minR=Math.min(sRow,r),maxR=Math.max(sRow,r);
    const minC=Math.min(sCol,c),maxC=Math.max(sCol,c);
    drawLasso(minR,minC,maxR,maxC); updateTmp(minR,minC,maxR,maxC);
  }
});
window.addEventListener('pointerup',e=>{
  if(!down) return; down=false;
  if(drag){ drag=false; lasso.style.display='none';
    clearSel(); tmp.forEach(td=>sel.add(td)); tmp.clear(); saveState(); return;
  }
  const td=e.target.closest('td'); if(!td) return;
  if(sel.size){ clearSel(); return; }
  td.classList.toggle('on'); saveState();
});
document.addEventListener('pointerdown',e=>{ if(!grid.contains(e.target)) clearSel(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') clearSel(); });

/* arrow-key move */
document.addEventListener('keydown',e=>{
  if(!sel.size||e.target.tagName==='INPUT') return;
  let dR=0,dC=0;
  switch(e.key){
    case'ArrowUp':dR=-1;break;case'ArrowDown':dR=1;break;
    case'ArrowLeft':dC=-1;break;case'ArrowRight':dC=1;break;
    default:return;
  }
  e.preventDefault();
  for(const td of sel){
    const r=td.parentNode.rowIndex+dR, c=td.cellIndex+dC;
    if(r<0||r>=ROWS||c<0||c>=COLS) return;
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

/* tempo change saves ----------------------------------------------- */
tempoInput.addEventListener('change',saveState);
tempoInput.addEventListener('input', saveState);

/* key label save already inside updateKeyLabels */

/* ------------------------------------------------------------------
 * MANUAL PIANO PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown',e=>{
  const k=e.target.closest('.key'); if(!k) return;
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
playBtn .addEventListener('click',play );
pauseBtn.addEventListener('click',pause);
stopBtn .addEventListener('click',stop );
