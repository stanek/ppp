/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES      = [2, 3, 4, 5];
const NOTE_NAMES   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLE_ROOTS = ['A','C','D#','F#'];
const ROWS = 200;
const COLS = OCTAVES.length * NOTE_NAMES.length;
const CELL_PX = 26;
const PREVIEW_DUR = 0.25;        // seconds
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
const rowOct=piano.insertRow(), rowLab=piano.insertRow(), rowKey=piano.insertRow();
const labelCells=[];
OCTAVES.forEach(oct=>{
  const oc=rowOct.insertCell(); oc.colSpan=NOTE_NAMES.length; oc.textContent=oct; oc.className='octave';
  NOTE_NAMES.forEach(n=>{
    const lab=rowLab.insertCell(); lab.className='note'; labelCells.push(lab);
    const kc=rowKey.insertCell();  const div=document.createElement('div');
    div.className=`key ${n.includes('#')?'black':'white'}`; div.dataset.note=n+oct; kc.appendChild(div);
  });
});

/* helpers ------------------------------------------------------------ */
const NOTES_LINEAR = OCTAVES.flatMap(o=>NOTE_NAMES.map(n=>n+o));
const COL_PC = NOTES_LINEAR.map(n=>{
  const b=n.replace(/\d+/,'');
  return {C:0,'B#':0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,'Fb':4,'E#':5,
          F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11,'Cb':11}[b];
});

/* ------------------------------------------------------------------
 * SCALE LOGIC
 * ----------------------------------------------------------------*/
const NAT_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const MAJ=[0,2,4,5,7,9,11], MIN=[0,2,3,5,7,8,10];
const pcOf=t=>({C:0,'B#':0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,'Fb':4,'E#':5,
                F:5,'F#':6,'Gb':6,G:7,'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11,'Cb':11}[t]);
function spelledScale(t,m){
  const iv=m==='minor'?MIN:MAJ, r=pcOf(t), letSeq=['C','D','E','F','G','A','B'];
  const idx=letSeq.indexOf(t[0]), pcs=[], names=[];
  for(let i=0;i<7;i++){
    const L=letSeq[(idx+i)%7], nat=NAT_PC[L], tgt=(r+iv[i])%12;
    let d=(tgt-nat+12)%12; if(d>6)d-=12;
    let acc=''; if(d===1)acc='♯'; if(d===2)acc='♯♯';
    if(d===-1)acc='♭'; if(d===-2)acc='♭♭';
    pcs.push(tgt); names.push(L+acc);
  }
  return{pcs,names};
}

/* ------------------------------------------------------------------
 * PIANO LABELS + GRID SHADING
 * ----------------------------------------------------------------*/
function updateKeyLabels(){
  const {pcs,names}=spelledScale(tonicSel.value,modeSel.value);
  const inScale=new Set(pcs); const map={}; names.forEach((n,i)=>map[pcs[i]]=n);
  labelCells.forEach((c,i)=>c.textContent=map[COL_PC[i]]??'');
  for(let r=0;r<ROWS;r++){
    const cells=grid.rows[r].cells;
    for(let c=0;c<COLS;c++)
      inScale.has(COL_PC[c])?cells[c].classList.remove('outkey')
                            :cells[c].classList.add   ('outkey');
  }
  saveState();
}
tonicSel.addEventListener('change',updateKeyLabels);
modeSel .addEventListener('change',updateKeyLabels);

/* ------------------------------------------------------------------
 * BUILD GRID
 * ----------------------------------------------------------------*/
for(let r=0;r<ROWS;r++){const row=grid.insertRow();
  for(let c=0;c<COLS;c++) row.insertCell();}

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
  ), baseUrl:'https://tonejs.github.io/audio/salamander/'
}).toDestination();
const preview = col => sampler.triggerAttackRelease(NOTES_LINEAR[col], PREVIEW_DUR, Tone.now());

/* ------------------------------------------------------------------
 * SAVE / LOAD (grid & settings; fingering not persisted)
 * ----------------------------------------------------------------*/
function onIndices(){const a=[];for(let r=0;r<ROWS;r++){const cells=grid.rows[r].cells;
  for(let c=0;c<COLS;c++) if(cells[c].classList.contains('on')) a.push(r*COLS+c);}return a;}
function restoreOn(idx){idx.forEach(i=>{if(i>=ROWS*COLS)return;
  const r=Math.floor(i/COLS), c=i%COLS; grid.rows[r].cells[c].classList.add('on');});}
function saveState(){
  localStorage.setItem(STORE_KEY,JSON.stringify({
    key:tonicSel.value, mode:modeSel.value, tempo:tempo.value, on:onIndices()
  }));
}
(function load(){
  try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(!s)return; if(s.key)tonicSel.value=s.key; if(s.mode)modeSel.value=s.mode;
    if(s.tempo)tempo.value=s.tempo; if(Array.isArray(s.on)) restoreOn(s.on);}catch{}
})();
updateKeyLabels();
tempo.addEventListener('change',saveState); tempo.addEventListener('input',saveState);

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
function play (){ if(timer)return; timer=setInterval(step,60000/(+tempo.value||120)); }
function pause(){ if(!timer)return; clearInterval(timer); timer=null; held.forEach(n=>sampler.triggerRelease(n,Tone.now())); held.clear();}
function stop (){ pause(); rowPtr=0; cursor.style.transform='translateY(-2px)'; }

/* ------------------------------------------------------------------
 * GRID INTERACTION  +  FINGERING
 * ----------------------------------------------------------------*/
const sel=new Set(); let tmp=new Set();
let down=false,drag=false,sRow=0,sCol=0, hover=null;

function clearSel(){ sel.forEach(td=>td.classList.remove('selected')); sel.clear(); }

grid.addEventListener('pointerover',e=>{
  hover=e.target.closest('td')||null;
  if(!down||!hover)return;
  const r=hover.parentNode.rowIndex, c=hover.cellIndex;
  if(!drag&&(r!==sRow||c!==sCol)){drag=true; lasso.style.display='block';}
  if(drag){
    const minR=Math.min(sRow,r),maxR=Math.max(sRow,r),minC=Math.min(sCol,c),maxC=Math.max(sCol,c);
    lasso.style.display='block';
    lasso.style.left=minC*CELL_PX+'px'; lasso.style.top=minR*CELL_PX+'px';
    lasso.style.width=(maxC-minC+1)*CELL_PX+'px';
    lasso.style.height=(maxR-minR+1)*CELL_PX+'px';
    tmp.forEach(t=>t.classList.remove('selected')); tmp.clear();
    for(let R=minR;R<=maxR;R++){const cells=grid.rows[R].cells;
      for(let C=minC;C<=maxC;C++){const td=cells[C];
        if(td.classList.contains('on')){td.classList.add('selected'); tmp.add(td);} } }
  }
});
grid.addEventListener('pointerdown',e=>{
  const td=e.target.closest('td'); if(!td)return;
  down=true; drag=false; sRow=td.parentNode.rowIndex; sCol=td.cellIndex;
  if(sel.size) return;
});
window.addEventListener('pointerup',e=>{
  if(!down)return; down=false;
  if(drag){ drag=false; lasso.style.display='none';
    clearSel(); tmp.forEach(td=>sel.add(td)); tmp.forEach(td=>preview(td.cellIndex));
    tmp.clear(); saveState(); return; }
  const td=e.target.closest('td'); if(!td) return;
  if(sel.size){ clearSel(); return; }
  td.classList.toggle('on');
  td.textContent=''; td.classList.remove('fingering');
  if(td.classList.contains('on')) preview(td.cellIndex);
  saveState();
});
document.addEventListener('pointerdown',e=>{ if(!grid.contains(e.target)) clearSel(); });

/* keydown: Esc, arrow move, fingering digits ------------------------ */
document.addEventListener('keydown',e=>{
  /* Esc clears selection */
  if(e.key==='Escape'){ clearSel(); return; }

  /* Arrow move for selection */
  if(sel.size && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    let dR=0,dC=0; if(e.key==='ArrowUp')dR=-1; if(e.key==='ArrowDown')dR=1;
    if(e.key==='ArrowLeft')dC=-1; if(e.key==='ArrowRight')dC=1; e.preventDefault();
    for(const td of sel){const r=td.parentNode.rowIndex+dR,c=td.cellIndex+dC;
      if(r<0||r>=ROWS||c<0||c>=COLS) return;}
    const moves=[]; sel.forEach(src=>{
      const r=src.parentNode.rowIndex,c=src.cellIndex;
      moves.push([src,grid.rows[r+dR].cells[c+dC]]);});
    moves.forEach(([s])=>s.classList.remove('on','selected','fingering')); /* clear src */
    moves.forEach(([,d])=>{d.classList.add('on','selected'); d.textContent='';});        /* dest blank */
    sel.clear(); moves.forEach(([,d])=>sel.add(d)); saveState(); return;
  }

  /* Fingering digits 1-5 */
  if(!hover || !hover.classList.contains('on')) return;
  if(['1','2','3','4','5'].includes(e.key)){
    hover.textContent=e.key; hover.classList.add('fingering');
  }else{
    hover.textContent=''; hover.classList.remove('fingering');
  }
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
