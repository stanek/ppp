Below is a **fully-integrated update**—three files that add playback (Play / Pause / Stop + tempo), a red scrolling cursor, “held” note logic, and a **200-row** sequencer.
Copy them over your current versions.

---

## 1 · index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Playable Piano</title>

  <!-- Tone.js -->
  <script src="https://unpkg.com/tone@latest/build/Tone.js"></script>

  <!-- styling -->
  <link rel="stylesheet" href="styles.css">
</head>

<body>
  <h1>Mini Piano + Grid Sequencer</h1>

  <!-- Transport controls -->
  <div id="transport">
    <button id="playBtn">▶︎ Play</button>
    <button id="pauseBtn">‖ Pause</button>
    <button id="stopBtn">■ Stop</button>
    <label>
      Tempo 
      <input id="tempo" type="number" value="120" min="30" max="300">
      BPM
    </label>
  </div>

  <!-- Piano & grid -->
  <table id="piano"></table>
  <table id="grid" class="seq"></table>

  <!-- logic -->
  <script defer src="script.js"></script>
</body>
</html>
```

---

## 2 · styles.css

```css
/* ----------- COLOR VARIABLES ------------------------------------------ */
:root{
  --white-key:#fff;
  --black-key:#111;
  --active:   #228b22;

  --key-w : 25px;
  --key-h : 150px;
  --grid-s: calc(var(--key-w) + 1px);  /* 26 px incl. shared border */
}

/* ----------- BASIC LAYOUT --------------------------------------------- */
body{
  margin:0; padding:1rem; background:#222; color:#ddd;
  font-family:system-ui,sans-serif; user-select:none; text-align:center;
}
table{ border-collapse:collapse; margin-inline:auto; }
td   { padding:0; text-align:center; }

/* ----------- TRANSPORT ------------------------------------------------- */
#transport{ margin:0 0 1rem; display:flex; gap:.5rem; justify-content:center; }
#transport input{ width:4rem; }

/* ----------- LABEL ROWS ------------------------------------------------ */
.octave{ font-size:1.5rem; font-weight:700;
         border-left:2px solid #777; border-right:2px solid #777; }
.note  { font-size:.9rem; }

/* ----------- KEYS ------------------------------------------------------ */
.key{
  width:var(--key-w); height:var(--key-h);
  border:1px solid #444; display:inline-block; cursor:pointer;
}
.white{ background:var(--white-key); }
.black{ background:var(--black-key); color:#eee; }
.held { filter:brightness(75%); }

/* ----------- SEQUENCER GRID ------------------------------------------- */
.seq{ position:relative; }                   /* needed for cursor overlay */
.seq td{
  width:var(--grid-s); height:var(--grid-s);
  background:#333; border:1px solid #555; cursor:pointer;
}
.seq .on{ background:var(--active); }

/* --- red playback cursor ---------------------------------------------- */
#cursor{
  position:absolute; left:0; right:0; height:2px;
  background:red; pointer-events:none;
  transform:translateY(-2px);                /* start just above first row */
}
```

---

## 3 · script.js

```js
/* ----------------------------------------------------------------------
 *  CONFIGURATION
 * --------------------------------------------------------------------*/
const OCTAVE_RANGE        = [2, 3, 4, 5];
const NOTE_ORDER          = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SALAMANDER_SAMPLES  = ['A','C','D#','F#'];
const GRID_ROWS           = 200;         // ⬅︎ 200 time-steps

/* ----------------------------------------------------------------------
 *  DOM REFERENCES
 * --------------------------------------------------------------------*/
const pianoTable = document.getElementById('piano');
const gridTable  = document.getElementById('grid');

const playBtn   = document.getElementById('playBtn');
const pauseBtn  = document.getElementById('pauseBtn');
const stopBtn   = document.getElementById('stopBtn');
const tempoInput= document.getElementById('tempo');

/* ----------------------------------------------------------------------
 *  BUILD PIANO  (octave bar + labels + keys)
 * --------------------------------------------------------------------*/
const octRow  = pianoTable.insertRow();
const noteRow = pianoTable.insertRow();
const keyRow  = pianoTable.insertRow();

OCTAVE_RANGE.forEach(oct => {
  const ocCell = octRow.insertCell();
  ocCell.colSpan = NOTE_ORDER.length;
  ocCell.textContent = oct;
  ocCell.className = 'octave';

  NOTE_ORDER.forEach(note => {
    // note labels
    const nCell = noteRow.insertCell();
    nCell.textContent = note.replace('#','♯');
    nCell.className = 'note';

    // playable key
    const kCell = keyRow.insertCell();
    const div = document.createElement('div');
    div.className = `key ${note.includes('#') ? 'black':'white'}`;
    div.dataset.note = note + oct;
    kCell.appendChild(div);
  });
});

/* ----------------------------------------------------------------------
 *  BUILD SEQUENCER GRID  (48 cols × 200 rows)
 * --------------------------------------------------------------------*/
const COLS = NOTE_ORDER.length * OCTAVE_RANGE.length;   // 48
for (let r = 0; r < GRID_ROWS; r++) {
  const row = gridTable.insertRow();
  for (let c = 0; c < COLS; c++) {
    const cell = row.insertCell();
    cell.addEventListener('click', () => cell.classList.toggle('on'));
  }
}

/* cursor overlay */
const cursor = document.createElement('div');
cursor.id = 'cursor';
gridTable.appendChild(cursor);

/* cell size in px (matches CSS var) */
const CELL = 26;

/* ----------------------------------------------------------------------
 *  AUDIO – Tone.Sampler (Salamander Grand)
 * --------------------------------------------------------------------*/
const sampler = new Tone.Sampler({
  urls: Object.fromEntries(
    OCTAVE_RANGE.flatMap(oct =>
      SALAMANDER_SAMPLES.map(n => {
        const file = n.replace('#','s') + oct + '.mp3';
        return [`${n}${oct}`, file];
      })
    )
  ),
  baseUrl:'https://tonejs.github.io/audio/salamander/',
}).toDestination();

/* helper to map column index ➜ note name */
const NOTES_LINEAR = OCTAVE_RANGE.flatMap(oct =>
  NOTE_ORDER.map(n => n + oct)
);

/* ----------------------------------------------------------------------
 *  PLAYBACK ENGINE
 * --------------------------------------------------------------------*/
let rowIdx    = 0;           // current row pointer
let timerId   = null;        // setInterval handle
const heldSet = new Set();   // notes currently sounding

function step() {
  // 1) stop notes that should end
  heldSet.forEach(n => {
    const col = NOTES_LINEAR.indexOf(n);
    if (!gridTable.rows[rowIdx]?.cells[col]?.classList.contains('on')) {
      sampler.triggerRelease(n, Tone.now());
      heldSet.delete(n);
    }
  });

  // 2) start notes in this row that are not yet held
  const cells = gridTable.rows[rowIdx].cells;
  for (let c = 0; c < COLS; c++) {
    if (cells[c].classList.contains('on')) {
      const note = NOTES_LINEAR[c];
      if (!heldSet.has(note)) {
        sampler.triggerAttack(note, Tone.now());
        heldSet.add(note);
      }
    }
  }

  // 3) move red cursor
  cursor.style.transform = `translateY(${rowIdx * CELL}px)`;

  // 4) advance
  rowIdx++;
  if (rowIdx >= GRID_ROWS) stop();          // reached end
}

function play() {
  if (timerId) return;                      // already playing
  const bpm = parseFloat(tempoInput.value) || 120;
  const msPerRow = 60000 / bpm;            // 1 row = 1 beat
  timerId = setInterval(step, msPerRow);
}

function pause() {
  if (!timerId) return;
  clearInterval(timerId);
  timerId = null;
  releaseAll();
}

function stop() {
  pause();                                 // stops + releases
  rowIdx = 0;
  cursor.style.transform = 'translateY(-2px)';
}

function releaseAll() {
  heldSet.forEach(n => sampler.triggerRelease(n, Tone.now()));
  heldSet.clear();
}

/* ----------------------------------------------------------------------
 *  MOUSE NOTE PLAY (independent of sequencer)
 * --------------------------------------------------------------------*/
pianoTable.addEventListener('pointerdown', e => {
  const key = e.target.closest('.key');
  if (!key) return;
  key.classList.add('held');
  sampler.triggerAttack(key.dataset.note, Tone.now());
});
window.addEventListener('pointerup', () => {
  document.querySelectorAll('.key.held').forEach(k => {
    k.classList.remove('held');
    sampler.triggerRelease(k.dataset.note, Tone.now());
  });
});

/* ----------------------------------------------------------------------
 *  TRANSPORT BUTTON HOOK-UP
 * --------------------------------------------------------------------*/
playBtn .addEventListener('click', play);
pauseBtn.addEventListener('click', pause);
stopBtn .addEventListener('click', stop);
```

---

### How it works

| Feature                 | Implementation notes                                                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **200-row grid**        | `GRID_ROWS = 200`; grid builder loop creates 200 rows.                                                                                                   |
| **Play / Pause / Stop** | Buttons trigger `play()`, `pause()`, `stop()`. `stop()` also rewinds the red cursor to the top.                                                          |
| **Tempo**               | Numeric `<input>` in BPM; each sequencer step = one beat (`60000 / BPM` ms).                                                                             |
| **Red cursor**          | Absolutely-positioned `<div id="cursor">` inside `.seq`; `translateY` animates down by `CELL (26 px)` each step.                                         |
| **Held notes**          | A `Set` tracks sounding notes. A note is attacked only when it first appears and released the first row it turns off, so consecutive “on” cells sustain. |
| **Manual key play**     | Piano row still works with pointer-down/-up.                                                                                                             |

Open **index.html**, click **Play**, and watch the red line march downward, triggering every green cell in time. 🎹
