/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES=[2,3,4,5];
const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLE_ROOTS=['A','C','D#','F#'];
const ROWS=200, COLS=OCTAVES.length*NOTE_NAMES.length, CELL_PX=26;
const PREVIEW_DUR=0.25;              // sec
const STORE_KEY='pianoSequencerState';

/* ------------------------------------------------------------------
 * DOM
 * ----------------------------------------------------------------*/
const piano=document.getElementById('piano');
const grid =document.getElementById('grid');
const playB=document.getElementById('playBtn');
const pauseB=document.getElementById('pauseBtn');
const stopB=document.getElementById('stopBtn');
const tempo=document.getElementById('tempo');
const tonicSel=document.getElementById('tonicSelect');
const modeSel =document.getElementById('modeSelect');

/* ------------------------------------------------------------------
 * BUILD PIANO HEADER
 * ----------------------------------------------------------------*/
const rowOct=piano.insertRow(),rowLab=piano.insertRow(),rowKey=piano.insertRow();
const labelCells=[];
OCTAVES.forEach(o=>{
  const oc=rowOct.insertCell();oc.colSpan=NOTE_NAMES.length;oc.textContent=o;oc.className='octave';
  NOTE_NAMES.forEach(n=>{
    labelCells.push(rowLab.insertCell()).className='note';
    const kc=rowKey.insertCell(),div=document.createElement('div');
    div.className=`key ${n.includes('#')?'black':'white'}`;div.dataset.note=n+o;kc.appendChild(div);
  });
});

/* helpers ----------------------------------------------------------- */
const pcOf=t=>({C:0,'B#':0,'C#':1,'Db':1,D:2,'D#':3,'Eb':3,E:4,'Fb':4,'E#':5,F:5,'F#':6,'Gb':6,G:7,
                'G#':8,'Ab':8,A:9,'A#':10,'Bb':10,B:11,'Cb':11}[t]);
const NOTES_LINEAR=OCTAVES.flatMap(o=>NOTE_NAMES.map(n=>n+o));
const COL_PC=NOTES_LINEAR.map(n=>pcOf(n.replace(/\d+/,'')));

/* ------------------------------------------------------------------
 * SCALE LABELS & GRID SHADING
 * ----------------------------------------------------------------*/
const NAT_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const MAJ=[0,2,4,5,7,9,11],MIN=[0,2,3,5,7,8,10];
function spelledScale(t,m){
  const iv=m==='minor'?MIN:MAJ,root=pcOf(t),letters=['C','D','E','F','G','A','B'];
  const idx=letters.indexOf(t[0]),pcs=[],names=[];
  for(let i=0;i<7;i++){
    const L=letters[(idx+i)%7],nat=NAT_PC[L],tgt=(root+iv[i])%12;
    let d=(tgt-nat+12)%12;if(d>6)d-=12;
    let acc=''; if(d===1)acc='♯'; if(d===2)acc='♯♯'; if(d===-1)acc='♭'; if(d===-2)acc='♭♭';
    pcs.push(tgt);names.push(L+acc);}
  return{pcs,names};
}
function updateKeyLabels(){
  const {pcs,names}=spelledScale(tonicSel.value,modeSel.value);
  const inScale=new Set(pcs),map={};names.forEach((n,i)=>map[pcs[i]]=n);
  labelCells.forEach((c,i)=>c.textContent=map[COL_PC[i]]??'');
  for(let r=0;r<ROWS;r++){const cells=grid.rows[r].cells;
    for(let c=0;c<COLS;c++) inScale.has(COL_PC[c])?cells[c].classList.remove('outkey')
                                                 :cells[c].classList.add   ('outkey');}
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
grid.append(Object.assign(document.createElement('div'),{id:'cursor'}),
            Object.assign(document.createElement('div'),{id:'lasso'}));
const cursor=document.getElementById('cursor'),lasso=document.getElementById('lasso');

/* ------------------------------------------------------------------
 * AUDIO
 * ----------------------------------------------------------------*/
const sampler=new Tone.Sampler({
  urls:Object.fromEntries(OCTAVES.flatMap(o=>SAMPLE_ROOTS.map(n=>[`${n}${o}`,n.replace('#','s')+o+'.mp3']))),
  baseUrl:'https://tonejs.github.io/audio/salamander/'
}).toDestination();
const preview=col=>sampler.triggerAttackRelease(NOTES_LINEAR[col],PREVIEW_DUR,Tone.now());

/* ------------------------------------------------------------------
 * STATE MANAGEMENT  (save/load green, blue, fingering)
 * ----------------------------------------------------------------*/
function collectState(){
  const green=[], blue=[], fing=[];
  for(let r=0;r<ROWS;r++){const cells=grid.rows[r].cells;
    for(let c=0;c<COLS;c++){
      const td=cells[c]; const idx=r*COLS+c;
      if(td.classList.contains('on'))   green.push(idx);
      if(td.classList.contains('blue')) blue.push(idx);
      if(td.classList.contains('fingering')) fing.push([idx,td.textContent]);
    }}
  return{key:tonicSel.value,mode:modeSel.value,tempo:tempo.value,green,blue,fing};
}
function applyState(s){
  if(s.key)tonicSel.value=s.key; if(s.mode)modeSel.value=s.mode;
  if(s.tempo)tempo.value=s.tempo;
  if(Array.isArray(s.green))s.green.forEach(i=>grid.rows[Math.floor(i/COLS)].cells[i%COLS].classList.add('on'));
  if(Array.isArray(s.blue ))s.blue .forEach(i=>grid.rows[Math.floor(i/COLS)].cells[i%COLS].classList.add('blue'));
  if(Array.isArray(s.fing ))s.fing .forEach(([i,d])=>{
    const td=grid.rows[Math.floor(i/COLS)].cells[i%COLS];
    td.classList.add('fingering'); td.textContent=d;});
}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(collectState()));}
(function(){try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(s)applyState(s);}catch{}})();
updateKeyLabels(); tempo.addEventListener('change',saveState); tempo.addEventListener('input',saveState);

/* ------------------------------------------------------------------
 * PLAYBACK ENGINE  (green OR blue sound)
 * ----------------------------------------------------------------*/
let rowPtr=0,timer=null,held=new Set();
function isNote(td){return td.classList.contains('on')||td.classList.contains('blue');}
function step(){
  held.forEach(n=>{const col=NOTES_LINEAR.indexOf(n);
    if(!grid.rows[rowPtr]?.cells[col]||!isNote(grid.rows[rowPtr].cells[col])){
      sampler.triggerRelease(n,Tone.now()); held.delete(n);} });
  const cells=grid.rows[rowPtr].cells;
  for(let c=0;c<COLS;c++){
    if(isNote(cells[c]) && !held.has(NOTES_LINEAR[c])){
      sampler.triggerAttack(NOTES_LINEAR[c],Tone.now()); held.add(NOTES_LINEAR[c]);}}
  cursor.style.transform=`translateY(${rowPtr*CELL_PX}px)`; if(++rowPtr>=ROWS) stop();}
function play(){if(timer)return;timer=setInterval(step,60000/(+tempo.value||120));}
function pause(){if(!timer)return;clearInterval(timer);timer=null;held.forEach(n=>sampler.triggerRelease(n,Tone.now()));held.clear();}
function stop (){pause();rowPtr=0;cursor.style.transform='translateY(-2px)';}

/* ------------------------------------------------------------------
 * GRID INTERACTION (green + blue + fingering)
 * ----------------------------------------------------------------*/
const sel=new Set();let tmp=new Set();let down=false,drag=false,sRow=0,sCol=0,hover=null;
function clearSel(){sel.forEach(t=>t.classList.remove('selected'));sel.clear();}

grid.addEventListener('contextmenu',e=>e.preventDefault());  // disable right-click menu
grid.addEventListener('pointerover',e=>{
  hover=e.target.closest('td')||null;
  if(!down||!hover)return;
  const r=hover.parentNode.rowIndex,c=hover.cellIndex;
  if(!drag&&(r!==sRow||c!==sCol)){drag=true;lasso.style.display='block';}
  if(drag){
    const [minR,maxR]=[Math.min(sRow,r),Math.max(sRow,r)];
    const [minC,maxC]=[Math.min(sCol,c),Math.max(sCol,c)];
    Object.assign(lasso.style,{left:minC*CELL_PX+'px',top:minR*CELL_PX+'px',
      width:(maxC-minC+1)*CELL_PX+'px',height:(maxR-minR+1)*CELL_PX+'px',display:'block'});
    tmp.forEach(t=>t.classList.remove('selected'));tmp.clear();
    for(let R=minR;R<=maxR;R++){const cells=grid.rows[R].cells;
      for(let C=minC;C<=maxC;C++){const td=cells[C];
        if(isNote(td)){td.classList.add('selected');tmp.add(td);}}}
  }
});
grid.addEventListener('pointerdown',e=>{
  const td=e.target.closest('td');if(!td)return;
  down=true;drag=false;sRow=td.parentNode.rowIndex;sCol=td.cellIndex;if(sel.size)return;
});
window.addEventListener('pointerup',e=>{
  if(!down)return;down=false;
  if(drag){drag=false;lasso.style.display='none';
    clearSel();tmp.forEach(t=>sel.add(t));tmp.forEach(t=>preview(t.cellIndex));tmp.clear();saveState();return;}
  const td=e.button===2?hover:e.target.closest('td'); if(!td)return;
  if(sel.size){clearSel();return;}
  /* LEFT (0): green toggle | RIGHT (2): blue toggle */
  if(e.button===2){
    td.classList.toggle('blue');td.classList.remove('on');
    if(td.classList.contains('blue')) preview(td.cellIndex);
  }else{
    td.classList.toggle('on');td.classList.remove('blue');
    if(td.classList.contains('on')) preview(td.cellIndex);
  }
  td.textContent='';td.classList.remove('fingering');
  saveState();
});

/* click outside grid clears selection */
document.addEventListener('pointerdown',e=>{if(!grid.contains(e.target))clearSel();});

/* key actions: Esc, arrows, fingering digits ------------------------ */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){clearSel();return;}

  /* arrow move if selection */
  if(sel.size && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
    let dR=0,dC=0;if(e.key==='ArrowUp')dR=-1;if(e.key==='ArrowDown')dR=1;
    if(e.key==='ArrowLeft')dC=-1;if(e.key==='ArrowRight')dC=1;e.preventDefault();
    for(const td of sel){const r=td.parentNode.rowIndex+dR,c=td.cellIndex+dC;
      if(r<0||r>=ROWS||c<0||c>=COLS)return;}
    const moves=[];sel.forEach(src=>{
      const r=src.parentNode.rowIndex,c=src.cellIndex;
      moves.push([src,grid.rows[r+dR].cells[c+dC],
                  src.classList.contains('blue'),src.textContent]);});
    moves.forEach(([s])=>{s.classList.remove('on','blue','selected','fingering');s.textContent='';});
    moves.forEach(([,d,isBlue,f])=>{
      d.classList.add(isBlue?'blue':'on');d.classList.add('selected');
      d.textContent=f||'';if(f)d.classList.add('fingering');});
    sel.clear();moves.forEach(([,d])=>sel.add(d));saveState();return;
  }

  /* fingering digits */
  if(!hover||!isNote(hover))return;
  if(['1','2','3','4','5'].includes(e.key)){
    hover.textContent=e.key;hover.classList.add('fingering');
  }else{hover.textContent='';hover.classList.remove('fingering');}
  saveState();
});

/* ------------------------------------------------------------------
 * MANUAL PIANO PLAY
 * ----------------------------------------------------------------*/
piano.addEventListener('pointerdown',e=>{
  const k=e.target.closest('.key');if(!k)return;
  k.classList.add('held');sampler.triggerAttack(k.dataset.note,Tone.now());
});
window.addEventListener('pointerup',()=>{
  document.querySelectorAll('.key.held').forEach(k=>{
    k.classList.remove('held');sampler.triggerRelease(k.dataset.note,Tone.now());
  });
});

/* ------------------------------------------------------------------
 * TRANSPORT BUTTONS
 * ----------------------------------------------------------------*/
playB.addEventListener('click',play);
pauseB.addEventListener('click',pause);
stopB.addEventListener('click',stop);
