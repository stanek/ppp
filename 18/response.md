Below is an **end-to-end update** that lets you set the key with two dropdowns (tonic + Major/Minor) and automatically:

* **Shows scale-correct note labels** (e.g. C D E F G A B for C major,
  C♯ D♯ E♯ F♯ G♯ A♯ B♯ for C♯ major, etc.).
* **Hides labels** for piano keys **outside** the chosen key.

Everything else—playback, lasso, moving notes—behaves exactly as before.

---

## 1 · index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Playable Piano Sequencer</title>

  <!-- Tone.js -->
  <script src="https://unpkg.com/tone@latest/build/Tone.js"></script>
  <link rel="stylesheet" href="styles.css">
</head>

<body>
  <!-- ◀ key selectors -->
  <div id="keySelect">
    <label>Key&nbsp;
      <select id="tonicSelect">
        <option>C</option><option>C#</option><option>Db</option>
        <option>D</option><option>D#</option><option>Eb</option>
        <option>E</option><option>F</option><option>F#</option><option>Gb</option>
        <option>G</option><option>G#</option><option>Ab</option>
        <option>A</option><option>A#</option><option>Bb</option>
        <option>B</option><option>Cb</option>
      </select>
    </label>
    <select id="modeSelect">
      <option value="major">Major</option>
      <option value="minor">Minor</option>
    </select>
  </div>

  <!-- transport -->
  <div id="transport">
    <button id="playBtn">▶︎ Play</button>
    <button id="pauseBtn">‖ Pause</button>
    <button id="stopBtn">■ Stop</button>
    <label>
      Tempo <input id="tempo" type="number" value="120" min="30" max="300"> BPM
    </label>
  </div>

  <!-- piano + grid -->
  <table id="piano"></table>
  <table id="grid" class="seq"></table>

  <script defer src="script.js"></script>
</body>
</html>
```

---

## 2 · styles.css

*(tiny additions: position the dropdowns)*

```css
/* previous content unchanged … */

#keySelect{
  display:inline-flex; gap:.5rem; margin-bottom:.5rem;
  align-items:center; justify-content:center;
}
#keySelect select{ padding:.2rem; }
```

*(keep the rest of the CSS exactly as in the last version you had)*

---

## 3 · script.js

*(full file; replaces the old one)*

```js
/* ------------------------------------------------------------------
 * CONFIGURATION
 * ----------------------------------------------------------------*/
const OCTAVES  = [2, 3, 4, 5];
const NAMES    = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SAMPLES  = ['A','C','D#','F#'];
const ROWS     = 200;
const COLS     = OCTAVES.length * NAMES.length;
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
const tonicSel = document.getElementById('tonicSelect');
const modeSel  = document.getElementById('modeSelect');

/* ------------------------------------------------------------------
 * BUILD PIANO HEADER
 * ----------------------------------------------------------------*/
const octRow = piano.insertRow();
const labRow = piano.insertRow();
const keyRow = piano.insertRow();
const labelCells = [];                    // keep references for updates

OCTAVES.forEach(oct=>{
  const oc = octRow.insertCell();
  oc.colSpan = NAMES.length;
  oc.textContent = oct;
  oc.className = 'octave';

  NAMES.forEach(n=>{
    const lab = labRow.insertCell();
    labRow.lastChild.className='note';
    labelCells.push(lab);

    const kc = keyRow.insertCell();
    const div = document.createElement('div');
    div.className = `key ${n.includes('#') ? 'black':'white'}`;
    div.dataset.note = n + oct;
    kc.appendChild(div);
  });
});

/* linear col→note map (no octave) */
const NOTES_LINEAR = OCTAVES.flatMap(o=>NAMES.map(n=>n+o));

/* ------------------------------------------------------------------
 * KEY / SCALE LOGIC
 * ----------------------------------------------------------------*/
const NAT_PC = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
const SHARP_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const FLAT_NAMES =['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const MAJ_INTV   =[0,2,4,5,7,9,11];
const MIN_INTV   =[0,2,3,5,7,8,10];

function pcOf(name){
  return {
    'C':0,'B#':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,
    'E':4,'Fb':4,'E#':5,'F':5,'F#':6,'Gb':6,'G':7,
    'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11,'Cb':11
  }[name];
}

function spelledScale(tonic, mode){
  const intervals = (mode==='minor') ? MIN_INTV : MAJ_INTV;
  const rootLetter = tonic[0];
  const rootPc     = pcOf(tonic);

  const letters = ['C','D','E','F','G','A','B'];
  const rootIdx = letters.indexOf(rootLetter);

  const names = [];
  for(let i=0;i<7;i++){
    const letter = letters[(rootIdx+i)%7];
    const naturalPc = NAT_PC[letter];
    const targetPc  = (rootPc + intervals[i]) % 12;
    let diff = (targetPc - naturalPc + 12) % 12;
    if(diff>6) diff -= 12;           // prefer negatives for flats

    let acc = '';
    if(diff === 1)  acc = '♯';
    if(diff === 2)  acc = '♯♯';
    if(diff === -1) acc = '♭';
    if(diff === -2) acc = '♭♭';

    names.push(letter + acc);
  }
  return {pcs: intervals.map(i=>(rootPc+i)%12), names};
}

function prettify(pc, prefersSharps=true){
  return prefersSharps ? SHARP_NAMES[pc] : FLAT_NAMES[pc];
}

function updateKeyLabels(){
  const tonic = tonicSel.value;
  const mode  = modeSel.value;
  const {pcs, names} = spelledScale(tonic, mode);
  const prefersSharps = tonic.includes('#') ||
        ['G','D','A','E','B','F#','C#'].includes(tonic.replace('#',''));

  /* map pc → spelled name */
  const pc2name = {};
  names.forEach((n,i)=> pc2name[pcs[i]] = n);

  labelCells.forEach((cell, idx)=>{
    const pc = pcOf(NOTES_LINEAR[idx].replace(/\d+/,''));
    cell.textContent = pc2name[pc] ?? '';       // blank if not in key
    /* fallback pretty name when inside key but pc2name missing */
    if(cell.textContent==='' && pcs.includes(pc))
      cell.textContent = prettify(pc, prefersSharps);
  });
}

/* initialise labels */
updateKeyLabels();
tonicSel.addEventListener('change', updateKeyLabels);
modeSel .addEventListener('change', updateKeyLabels);

/* ------------------------------------------------------------------
 * GRID + PLAYBACK (same as previous version, trimmed for brevity)
 * ----------------------------------------------------------------*/

/* … (all the existing grid-building, lasso, moving, playback, etc.
       from the last script you had remains exactly the same) … */

/* ------------------------------------------------------------------
 * !!  IMPORTANT  !!
 * Paste the entire “grid / lasso / playback” section from the
 * previous working script here, UNCHANGED.  Only the header above
 * was modified to add key-label logic.
 * ----------------------------------------------------------------*/
```

> **Note** – for readability, only the **new / modified parts** are shown above;
> paste the rest of your **unchanged** grid, lasso-selection, playback, and
> transport-button code (from the last working script) below the comment
> where indicated.

---

### How it works

1. **Dropdowns** choose the tonic (e.g. C#, Eb) and mode (Major/Minor).
2. `spelledScale()` spells the seven scale degrees correctly, using sharps or flats as required (e.g. C♯ major gives **E♯ / B♯**, not F / C).
3. `updateKeyLabels()` blanks every label cell, then fills only those whose pitch-class is in the scale, using the proper spelling. Keys outside the scale have **no label**.
4. All other functionality—toggle squares, drag-select, arrow-move, playback—remains untouched.

Open **index.html**, pick a key from the new dropdowns, and watch the piano’s note labels adjust instantly. Enjoy composing in any key! 🎹
